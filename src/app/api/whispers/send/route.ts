import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const DAILY_WHISPER_LIMIT = 5;

function getUtcDayKey(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as any;
    const receiverId = typeof body?.receiverId === "string" ? body.receiverId : "";
    const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl : "";

    if (!receiverId || !audioUrl) {
      return NextResponse.json(
        { error: "Missing receiverId or audioUrl" },
        { status: 400 },
      );
    }

    if (receiverId === uid) {
      return NextResponse.json(
        { error: "Cannot send a whisper to yourself" },
        { status: 400 },
      );
    }

    const now = Date.now();

    const result = await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("users").doc(uid);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new Error("USER_NOT_FOUND");
      }

      const data = userSnap.data() as any;
      const prevCount =
        typeof data.dailyWhisperCount === "number" ? data.dailyWhisperCount : 0;
      const lastWhisperDate =
        typeof data.lastWhisperDate === "number" ? data.lastWhisperDate : null;

      const todayKey = getUtcDayKey(now);
      let effectiveCount = 0;

      if (lastWhisperDate) {
        const lastKey = getUtcDayKey(lastWhisperDate);
        if (lastKey === todayKey) {
          effectiveCount = prevCount;
        }
      }

      if (effectiveCount >= DAILY_WHISPER_LIMIT) {
        throw new Error("LIMIT_EXCEEDED");
      }

      const newCount = effectiveCount + 1;

      tx.update(userRef, {
        dailyWhisperCount: newCount,
        lastWhisperDate: now,
      });

      const whisperRef = adminDb.collection("whispers").doc();

      tx.set(whisperRef, {
        id: whisperRef.id,
        senderId: uid,
        receiverId,
        audioUrl,
        status: "pending",
        createdAt: now,
      });

      return {
        whisperId: whisperRef.id,
        newCount,
      };
    });

    const remainingToday = Math.max(DAILY_WHISPER_LIMIT - result.newCount, 0);

    return NextResponse.json(
      {
        ok: true,
        whisperId: result.whisperId,
        status: "pending",
        remainingToday,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in whisper send API", error);

    if (error instanceof Error) {
      if (error.message === "LIMIT_EXCEEDED") {
        return NextResponse.json(
          {
            ok: false,
            code: "LIMIT_EXCEEDED",
            message:
              "Daily whispers maxed—come back tomorrow for more magic!",
          },
          { status: 429 },
        );
      }

      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { ok: false, error: "User profile not found" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "Failed to send whisper" },
      { status: 500 },
    );
  }
}
