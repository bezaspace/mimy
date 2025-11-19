import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { UserProfile } from "@/types";

export const runtime = "nodejs";

interface FeedProfileSummary {
  uid: string;
  displayName: string;
  age: number;
  location: {
    city: string;
    country: string;
  };
  bio: string;
  interests: string[];
  photoURL: string | null;
}

const DAILY_FEED_LIMIT = 20;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = userSnap.data() as UserProfile;

    if (!profile.isOpenToWhispers) {
      return NextResponse.json({ profiles: [], remainingQuota: 0, openToWhispers: false });
    }

    const today = new Date().toISOString().slice(0, 10);
    let feedDay = profile.feedDay || null;
    let feedServedCount = profile.feedServedCount ?? 0;

    if (feedDay !== today) {
      feedDay = today;
      feedServedCount = 0;
      await userRef.update({ feedDay, feedServedCount });
    }

    const remainingQuota = Math.max(0, DAILY_FEED_LIMIT - feedServedCount);

    if (remainingQuota <= 0) {
      return NextResponse.json({ profiles: [], remainingQuota, openToWhispers: true });
    }

    const seenUserIds = profile.seenUserIds || [];

    const candidatesSnap = await adminDb
      .collection("users")
      .where("isOpenToWhispers", "==", true)
      .limit(100)
      .get();

    const candidates: UserProfile[] = [];

    candidatesSnap.forEach((doc) => {
      if (doc.id === uid) {
        return;
      }
      const data = doc.data() as UserProfile;
      candidates.push(data);
    });

    const scored = candidates
      .filter((candidate) => !seenUserIds.includes(candidate.uid))
      .map((candidate) => {
        const interestScore = computeInterestScore(profile.interests, candidate.interests);
        const locationScore = computeLocationScore(profile.location.city, candidate.location.city);
        const randomScore = Math.random();
        const score = 0.7 * interestScore + 0.2 * locationScore + 0.1 * randomScore;

        const summary: FeedProfileSummary = {
          uid: candidate.uid,
          displayName: candidate.displayName,
          age: candidate.age,
          location: candidate.location,
          bio: candidate.bio,
          interests: candidate.interests,
          photoURL: candidate.photoURLs[0] || null,
        };

        return { summary, score };
      })
      .sort((a, b) => b.score - a.score);

    const selected = scored.slice(0, remainingQuota).map((item) => item.summary);

    const newServedCount = feedServedCount + selected.length;
    await userRef.update({ feedServedCount: newServedCount, feedDay });

    return NextResponse.json({
      profiles: selected,
      remainingQuota: Math.max(0, DAILY_FEED_LIMIT - newServedCount),
      openToWhispers: true,
    });
  } catch (error) {
    console.error("Error building feed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function computeInterestScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) {
    return 0;
  }

  const setB = new Set(b);
  let overlap = 0;

  for (const interest of a) {
    if (setB.has(interest)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(a.length, b.length);
}

function computeLocationScore(cityA: string, cityB: string): number {
  if (!cityA || !cityB) {
    return 0;
  }

  return cityA.toLowerCase() === cityB.toLowerCase() ? 1 : 0;
}
