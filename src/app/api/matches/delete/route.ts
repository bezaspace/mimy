import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { matchId } = await request.json();

        if (!matchId) {
            return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
        }

        const matchRef = adminDb.collection("matches").doc(matchId);
        const matchSnap = await matchRef.get();

        if (!matchSnap.exists) {
            return NextResponse.json({ error: "Match not found" }, { status: 404 });
        }

        const matchData = matchSnap.data();
        if (!matchData?.participantIds?.includes(uid)) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Remove user from participantIds
        await matchRef.update({
            participantIds: FieldValue.arrayRemove(uid),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting match:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
