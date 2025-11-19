import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { checkWhisperAudioSafety } from "@/lib/vertexGemini";

export const runtime = "nodejs";

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

    const formData = await request.formData();
    const file = formData.get("audio") as unknown as File | null;

    if (!file || typeof (file as any).arrayBuffer !== "function") {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = (file as any).type || "audio/webm";

    if (!buffer.length) {
      return NextResponse.json({ error: "Empty audio file" }, { status: 400 });
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large" }, { status: 413 });
    }

    const safetyResult = await checkWhisperAudioSafety(buffer, mimeType);

    const scores = safetyResult.categories || {};
    const riskyKeys = [
      "sexual",
      "hate",
      "violence",
      "harassment",
      "self_harm",
    ];

    let maxRisk = 0;
    for (const key of riskyKeys) {
      const value = typeof scores[key] === "number" ? scores[key] : 0;
      if (value > maxRisk) {
        maxRisk = value;
      }
    }

    const overall = (safetyResult.overallDecision || "").toLowerCase();

    const shouldBlock = overall === "block" || maxRisk > 0.4;

    if (shouldBlock) {
      return NextResponse.json(
        {
          ok: false,
          decision: "block",
          scores,
          explanation:
            safetyResult.explanation ||
            "We picked up language that does not fit this app's vibe.",
          model: process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        decision: "allow",
        scores,
        explanation:
          safetyResult.explanation || "Safe to send as a polite introduction.",
        model: process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in whisper safety API", error);
    return NextResponse.json(
      {
        ok: false,
        decision: "error",
        message: "Safety check unavailable. Please try again.",
      },
      { status: 503 },
    );
  }
}
