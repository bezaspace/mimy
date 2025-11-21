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

    // Fetch all whispers for the user and sort in-memory to avoid composite index requirement
    const whispersSnap = await adminDb
      .collection("whispers")
      .where("senderId", "==", uid)
      .get();

    const allWhispers: any[] = [];
    whispersSnap.forEach((doc) => {
      allWhispers.push({ ...doc.data(), _docId: doc.id });
    });

    // Sort by createdAt desc
    allWhispers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Take top 100
    const recentWhispers = allWhispers.slice(0, 100);

    const receiverIds = new Set<string>();
    const whisperItems: any[] = [];

    for (const data of recentWhispers) {
      receiverIds.add(data.receiverId);

      whisperItems.push({
        id: data.id || data._docId,
        receiverId: data.receiverId,
        status: data.status || "pending",
        createdAt: data.createdAt || 0,
        playedAt:
          typeof data.playedAt === "number"
            ? data.playedAt
            : null,
        approvedAt:
          typeof data.approvedAt === "number"
            ? data.approvedAt
            : null,
        declinedAt:
          typeof data.declinedAt === "number"
            ? data.declinedAt
            : null,
        expiresAt:
          typeof data.expiresAt === "number"
            ? data.expiresAt
            : null,
      });
    }

    const receivers: Record<string, any> = {};

    await Promise.all(
      Array.from(receiverIds).map(async (receiverId) => {
        const receiverRef = adminDb.collection("users").doc(receiverId);
        const receiverSnap = await receiverRef.get();

        if (receiverSnap.exists) {
          const receiverData = receiverSnap.data() as any;
          receivers[receiverId] = {
            uid: receiverData.uid || receiverId,
            displayName: receiverData.displayName || "",
            age: receiverData.age || 0,
            location: receiverData.location || { city: "", country: "" },
            photoURL:
              Array.isArray(receiverData.photoURLs) && receiverData.photoURLs.length > 0
                ? receiverData.photoURLs[0]
                : null,
          };
        }
      }),
    );

    const items = whisperItems.map((w) => {
      const receiver = receivers[w.receiverId] || {
        uid: w.receiverId,
        displayName: "",
        age: 0,
        location: { city: "", country: "" },
        photoURL: null,
      };

      return {
        id: w.id,
        receiver,
        status: w.status,
        createdAt: w.createdAt,
        playedAt: w.playedAt,
        approvedAt: w.approvedAt,
        declinedAt: w.declinedAt,
        expiresAt: w.expiresAt,
      };
    });

    const totalSent = items.length;
    const totalPlayed = items.filter((item) => item.playedAt).length;
    const totalApproved = items.filter((item) => item.status === "approved").length;


    return NextResponse.json(
      {
        items,
        summary: {
          totalSent,
          totalPlayed,
          totalApproved,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching my whispers", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const whisperId = searchParams.get("id");

    if (!whisperId) {
      return NextResponse.json({ error: "Missing whisper ID" }, { status: 400 });
    }

    const whisperRef = adminDb.collection("whispers").doc(whisperId);
    const whisperSnap = await whisperRef.get();

    if (!whisperSnap.exists) {
      return NextResponse.json({ error: "Whisper not found" }, { status: 404 });
    }

    const whisperData = whisperSnap.data();

    if (whisperData?.senderId !== uid) {
      return NextResponse.json(
        { error: "You do not have permission to delete this whisper" },
        { status: 403 }
      );
    }

    await whisperRef.delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting whisper", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
