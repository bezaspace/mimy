import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { UserProfile } from "@/types";

export const runtime = "nodejs";

interface InteractionBody {
  targetUserId: string;
  type: "pass" | "viewed";
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = (await request.json()) as InteractionBody;

    if (!body?.targetUserId || !["pass", "viewed"].includes(body.type)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (body.targetUserId === uid) {
      return NextResponse.json({ error: "Cannot interact with self" }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = userSnap.data() as UserProfile;
    const existing = profile.seenUserIds || [];

    if (!existing.includes(body.targetUserId)) {
      const updated = [...existing, body.targetUserId];
      await userRef.update({ seenUserIds: updated });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording interaction", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
