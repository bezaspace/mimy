"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { WhisperModal } from "@/components/whisper/WhisperModal";
import Navbar from "@/components/Navbar";
import { FilterModal, FeedFilters } from "@/components/FilterModal";

export default function Home() {
  const { user, profile, loading, signInWithGoogle, logout } = useAuth();
  const router = useRouter();
  const [feedProfiles, setFeedProfiles] = useState<FeedProfileSummary[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [activeWhisperTarget, setActiveWhisperTarget] = useState<FeedProfileSummary | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>({});
  // Redirect logic for authenticated users without profiles
  useEffect(() => {
    if (!loading && user && !profile) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadFeed = async () => {
      if (!user || !profile) {
        return;
      }

      setFeedLoading(true);
      setFeedError(null);

      try {
        const idToken = await user.getIdToken();

        const params = new URLSearchParams();
        if (filters.minAge) params.append("minAge", filters.minAge.toString());
        if (filters.maxAge) params.append("maxAge", filters.maxAge.toString());
        if (filters.gender) params.append("gender", filters.gender);
        if (filters.city) params.append("city", filters.city);
        if (filters.orientation) params.append("orientation", filters.orientation);
        if (filters.interests && filters.interests.length > 0) {
          params.append("interests", filters.interests.join(","));
        }

        const response = await fetch(`/api/feed?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load feed");
        }

        const data = await response.json();

        setFeedProfiles(data.profiles || []);
        if (typeof data.remainingQuota === "number") {
          setRemainingQuota(data.remainingQuota);
        } else {
          setRemainingQuota(null);
        }
      } catch (err) {
        console.error("Error loading feed", err);
        setFeedError("Could not load feed right now.");
      } finally {
        setFeedLoading(false);
      }
    };

    if (user && profile) {
      loadFeed();
    }
  }, [user, profile, filters]);

  const handlePass = async (targetUserId: string) => {
    if (!user) {
      return;
    }

    setFeedProfiles((prev) => prev.filter((p) => p.uid !== targetUserId));

    try {
      const idToken = await user.getIdToken();
      await fetch("/api/feed/interaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUserId, type: "pass" }),
      });
    } catch (err) {
      console.error("Error recording interaction", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-serif animate-pulse">Loading...</div>
      </div>
    );
  }

  // Authenticated & Onboarded State (The Feed - Placeholder)
  if (user && profile) {
    return (
      <div className="flex h-screen flex-col items-center bg-gray-50 pb-[80px]">
        {activeWhisperTarget && (
          <WhisperModal
            target={activeWhisperTarget}
            onClose={() => setActiveWhisperTarget(null)}
          />
        )}
        <Navbar
          onFilterClick={() => setShowFilterModal(true)}
          activeFilterCount={Object.values(filters).filter(v => v !== undefined && v !== "").length}
        />

        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          initialFilters={filters}
          onApply={setFilters}
        />

        <main className="w-full h-full flex flex-col relative">
          {feedLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-gray-500 text-sm">Loading your feed...</div>
            </div>
          ) : feedError ? (
            <div className="bg-white p-6 rounded-2xl shadow-lg neo-border text-center">
              <p className="text-sm text-red-500">{feedError}</p>
            </div>
          ) : feedProfiles.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-lg neo-border text-center">
              <div className="text-6xl mb-4">🃏</div>
              <h2 className="text-2xl font-bold mb-2">The Feed is Empty</h2>
              <p className="text-gray-600 mb-2">
                You are one of the first users here! Wait for more people to join.
              </p>
              {remainingQuota === 0 && (
                <p className="text-xs text-gray-400">
                  You&apos;ve reached today&apos;s discovery limit.
                </p>
              )}
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-100 mt-4">
                <p className="text-pink-800 font-medium">Your Profile is Live!</p>
                <p className="text-pink-600 text-sm mt-1">{profile.bio}</p>
              </div>
            </div>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full items-center [&::-webkit-scrollbar]:hidden">
              {feedProfiles.map((p) => (
                <div key={p.uid} className="w-full flex-shrink-0 snap-center flex items-center justify-center h-full p-4">
                  <div className="w-full h-full max-w-md relative">
                    <FeedCard
                      profile={p}
                      onPass={() => handlePass(p.uid)}
                      onWhisper={() => setActiveWhisperTarget(p)}
                    />
                  </div>
                </div>
              ))}
              {typeof remainingQuota === "number" && (
                <div className="w-full flex-shrink-0 snap-center flex items-center justify-center h-full p-4">
                  <div className="bg-white p-8 rounded-3xl shadow-xl neo-border text-center max-w-xs mx-auto flex flex-col items-center justify-center gap-4">
                    <div className="text-6xl">😴</div>
                    <div>
                      <p className="text-xl font-bold mb-2">That&apos;s all for now!</p>
                      <p className="text-gray-500">
                        You can discover {remainingQuota} more profiles today.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Unauthenticated State (Landing Page)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        {/* Brand / Logo Area */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-primary neo-border flex items-center justify-center">
            <span className="text-4xl">💌</span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            May I Meet You?
          </h1>
          <p className="font-sans text-xl md:text-2xl max-w-md leading-relaxed">
            The <span className="bg-accent px-2 py-0.5 rounded-md neo-border text-base align-middle">rom-com</span> worthy dating app you've been waiting for.
          </p>
        </div>

        {/* Action Area */}
        <div className="mt-8 w-full max-w-xs">
          <div className="flex flex-col gap-4">
            <button
              onClick={signInWithGoogle}
              className="group relative w-full overflow-hidden rounded-xl bg-primary px-8 py-4 font-bold text-white neo-border hover:bg-primary-hover transition-colors"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                Sign In with Google
              </span>
            </button>
            <p className="text-sm text-center opacity-60">
              No passwords, just vibes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

type FeedProfileSummary = {
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
};

interface FeedCardProps {
  profile: FeedProfileSummary;
  onPass: () => void;
  onWhisper: () => void;
}

function FeedCard({ profile, onPass, onWhisper }: FeedCardProps) {
  const [revealed, setRevealed] = useState(false);
  const router = useRouter();

  const handleReveal = () => {
    setRevealed(true);
  };

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${profile.uid}`);
  };

  return (
    <div className="bg-white h-full rounded-3xl shadow-xl neo-border overflow-hidden flex flex-col relative">
      {/* Image Section - Takes available space */}
      <div
        className="flex-1 relative cursor-pointer group overflow-hidden"
        onClick={handleReveal}
      >
        {profile.photoURL ? (
          <img
            src={profile.photoURL}
            alt={profile.displayName}
            className={`w-full h-full object-cover transition-all duration-500 ${revealed ? "" : "blur-xl scale-110"
              }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
            No photo
          </div>
        )}

        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* View Profile Overlay Button */}
        {revealed && (
          <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button
              onClick={goToProfile}
              className="bg-white/20 hover:bg-white/40 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1 border border-white/30 transition-all"
            >
              View Profile
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content Section - Fixed at bottom */}
      <div className="p-5 flex flex-col gap-3 bg-white z-10">
        <div className="flex justify-between items-start">
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={goToProfile}
          >
            <h2 className="font-bold text-2xl text-gray-900 flex items-center gap-2">
              {profile.displayName}, {profile.age}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </h2>
            <p className="text-sm text-gray-500 font-medium">{profile.location.city}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{profile.bio}</p>

        {profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-pink-50 text-pink-700 border border-pink-100"
              >
                {interest}
              </span>
            ))}
            {profile.interests.length > 3 && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                +{profile.interests.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={onPass}
            className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
            type="button"
          >
            Pass
          </button>
          <button
            className="px-4 py-3 rounded-xl bg-primary text-white border-2 border-primary font-bold hover:bg-primary-hover hover:border-primary-hover transition-all shadow-md active:scale-95"
            type="button"
            onClick={onWhisper}
          >
            Whisper Hi
          </button>
        </div>
      </div>
    </div>
  );
}
