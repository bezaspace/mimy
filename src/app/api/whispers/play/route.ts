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

    if (!whisperId) {
      return NextResponse.json(
        { ok: false, error: "Missing whisperId" },
        { status: 400 },
      );
    }

    const whisperRef = adminDb.collection("whispers").doc(whisperId);
    const whisperSnap = await whisperRef.get();

    if (!whisperSnap.exists) {
      return NextResponse.json(
        { ok: false, error: "Whisper not found" },
        { status: 404 },
      );
    }

    const data = whisperSnap.data() as any;

    if (data.receiverId !== uid) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const now = Date.now();
    const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : null;

    if (expiresAt && expiresAt <= now) {
      return NextResponse.json(
        { ok: false, code: "EXPIRED", error: "Whisper has expired" },
        { status: 410 },
      );
    }

    if (typeof data.playedAt !== "number") {
      await whisperRef.update({ playedAt: now });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error recording whisper play", error);
    return NextResponse.json(
      { ok: false, error: "Failed to record play" },
      { status: 500 },
    );
  }
}
