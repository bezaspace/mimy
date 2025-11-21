import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { UserProfile } from "@/types";

export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    try {
        const authHeader = request.headers.get("authorization") || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await adminAuth.verifyIdToken(token);

        const { uid } = await params;
        if (!uid) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userSnap.data() as UserProfile;

        // Return only necessary public info if needed, but for now returning full profile
        // as per plan (assuming sensitive data is not in UserProfile or is safe to show)
        return NextResponse.json(userData);
    } catch (error) {
        console.error("Error fetching user profile", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
