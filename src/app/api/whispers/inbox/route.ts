import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid as string | undefined;

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = userSnap.data() as any;

    if (!profile.isOpenToWhispers) {
      return NextResponse.json(
        { items: [], unreadCount: 0, openToWhispers: false },
        { status: 200 },
      );
    }

    const now = Date.now();

    const whispersSnap = await adminDb
      .collection("whispers")
      .where("receiverId", "==", uid)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const senderIds = new Set<string>();
    const whisperItems: any[] = [];

    whispersSnap.forEach((doc) => {
      const data = doc.data() as any;
      const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : null;

      if (expiresAt && expiresAt <= now) {
        return;
      }

      const playedAt = typeof data.playedAt === "number" ? data.playedAt : null;

      senderIds.add(data.senderId);

      whisperItems.push({
        id: data.id || doc.id,
        senderId: data.senderId,
        audioUrl: data.audioUrl || "",
        createdAt: data.createdAt || 0,
        expiresAt,
        playedAt,
      });
    });

    const senders: Record<string, any> = {};

    await Promise.all(
      Array.from(senderIds).map(async (senderId) => {
        const senderRef = adminDb.collection("users").doc(senderId);
        const senderSnap = await senderRef.get();

        if (senderSnap.exists) {
          const senderData = senderSnap.data() as any;
          senders[senderId] = {
            uid: senderData.uid || senderId,
            displayName: senderData.displayName || "",
            age: senderData.age || 0,
            location: senderData.location || { city: "", country: "" },
            photoURL:
              Array.isArray(senderData.photoURLs) && senderData.photoURLs.length > 0
                ? senderData.photoURLs[0]
                : null,
          };
        }
      }),
    );

    const items = whisperItems.map((w) => {
      const sender = senders[w.senderId] || {
        uid: w.senderId,
        displayName: "",
        age: 0,
        location: { city: "", country: "" },
        photoURL: null,
      };

      return {
        whisperId: w.id,
        audioUrl: w.audioUrl,
        createdAt: w.createdAt,
        expiresAt: w.expiresAt,
        playedAt: w.playedAt,
        sender,
      };
    });

    const unreadCount = items.filter((item) => !item.playedAt).length;

    return NextResponse.json(
      { items, unreadCount, openToWhispers: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching whisper inbox", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
