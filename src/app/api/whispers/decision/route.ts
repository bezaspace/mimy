import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid as string | undefined;

    if (!uid) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as any;
    const whisperId = typeof body?.whisperId === "string" ? body.whisperId : "";
    const decision =
      body?.decision === "approve" || body?.decision === "decline"
        ? (body.decision as "approve" | "decline")
        : null;
 
    if (!whisperId || !decision) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    const now = Date.now();

    const result = await adminDb.runTransaction(async (tx) => {
      const whisperRef = adminDb.collection("whispers").doc(whisperId);
      const whisperSnap = await tx.get(whisperRef);

      if (!whisperSnap.exists) {
        throw new Error("NOT_FOUND");
      }

      const data = whisperSnap.data() as any;

      if (data.receiverId !== uid) {
        throw new Error("FORBIDDEN");
      }

      if (data.status !== "pending") {
        throw new Error("INVALID_STATUS");
      }

      const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : null;

      if (expiresAt && expiresAt <= now) {
        throw new Error("EXPIRED");
      }

      if (decision === "approve") {
        const matchRef = adminDb.collection("matches").doc();

        tx.update(whisperRef, {
          status: "approved",
          approvedAt: now,
        });

        tx.set(matchRef, {
          id: matchRef.id,
          whisperId: whisperRef.id,
          userAId: data.senderId,
          userBId: data.receiverId,
          createdAt: now,
          status: "active",
          participantIds: [data.senderId, data.receiverId],
          lastMessage: null,
          lastMessageAt: null,
          lastMessageSenderId: null,
        });

        return { decision: "approve" as const, matchId: matchRef.id };
      }

      tx.update(whisperRef, {
        status: "declined",
        declinedAt: now,
      });

      return { decision: "decline" as const, matchId: null };
    });

    if (result.decision === "approve") {
      return NextResponse.json(
        { ok: true, decision: "approve", matchId: result.matchId },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ok: true, decision: "decline" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error processing whisper decision", error);

    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json(
          { ok: false, error: "Whisper not found" },
          { status: 404 },
        );
      }

      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 },
        );
      }

      if (error.message === "INVALID_STATUS") {
        return NextResponse.json(
          { ok: false, error: "Invalid whisper status" },
          { status: 400 },
        );
      }

      if (error.message === "EXPIRED") {
        return NextResponse.json(
          { ok: false, code: "EXPIRED", error: "Whisper has expired" },
          { status: 410 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Failed to process decision" },
      { status: 500 },
    );
  }
}
