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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const searchParams = request.nextUrl.searchParams;
    const minAge = searchParams.get("minAge") ? parseInt(searchParams.get("minAge")!) : null;
    const maxAge = searchParams.get("maxAge") ? parseInt(searchParams.get("maxAge")!) : null;
    const gender = searchParams.get("gender");
    const city = searchParams.get("city");
    const orientation = searchParams.get("orientation");
    const interestsParam = searchParams.get("interests");
    const filterInterests = interestsParam ? interestsParam.split(",") : [];

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = userSnap.data() as UserProfile;

    if (!profile.isOpenToWhispers) {
      return NextResponse.json({ profiles: [], remainingQuota: null, openToWhispers: false });
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
      .filter((candidate) => {
        if (seenUserIds.includes(candidate.uid)) return false;
        if (minAge && candidate.age < minAge) return false;
        if (maxAge && candidate.age > maxAge) return false;
        if (gender && candidate.gender !== gender) return false;
        if (city && !candidate.location.city.toLowerCase().includes(city.toLowerCase())) return false;
        if (orientation && candidate.orientation !== orientation) return false;
        if (filterInterests.length > 0) {
          const hasInterest = candidate.interests.some((i) => filterInterests.includes(i));
          if (!hasInterest) return false;
        }
        return true;
      })
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

    const selected = scored.slice(0, 50).map((item) => item.summary);

    return NextResponse.json({
      profiles: selected,
      remainingQuota: null,
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
