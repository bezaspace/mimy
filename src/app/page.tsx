"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { WhisperModal } from "@/components/whisper/WhisperModal";

export default function Home() {
  const { user, profile, loading, signInWithGoogle, logout } = useAuth();
  const router = useRouter();
  const [feedProfiles, setFeedProfiles] = useState<FeedProfileSummary[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [activeWhisperTarget, setActiveWhisperTarget] = useState<FeedProfileSummary | null>(null);
  const [inboxUnread, setInboxUnread] = useState<number | null>(null);

  // Redirect logic for authenticated users without profiles
  useEffect(() => {
    if (!loading && user && !profile) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadInboxUnread = async () => {
      if (!user || !profile) {
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/whispers/inbox", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (typeof data.unreadCount === "number") {
          setInboxUnread(data.unreadCount);
        } else {
          setInboxUnread(null);
        }
      } catch (error) {
        console.error("Error loading inbox unread count", error);
        setInboxUnread(null);
      }
    };

    if (user && profile) {
      loadInboxUnread();
    }
  }, [user, profile]);

  useEffect(() => {
    const loadFeed = async () => {
      if (!user || !profile) {
        return;
      }

      setFeedLoading(true);
      setFeedError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/feed", {
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
  }, [user, profile]);

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
      <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4">
        {activeWhisperTarget && (
          <WhisperModal
            target={activeWhisperTarget}
            onClose={() => setActiveWhisperTarget(null)}
          />
        )}
        <header className="w-full max-w-md flex justify-between items-center p-4 bg-white rounded-xl shadow-sm mb-6">
          <div className="flex items-center gap-3">
            {profile.photoURLs[0] && (
              <img
                src={profile.photoURLs[0]}
                alt={profile.displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
              />
            )}
            <div>
              <h1 className="font-bold text-gray-800">Discover</h1>
              <p className="text-xs text-gray-500">{profile.location.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/whispers")}
              className="relative text-sm text-gray-500 hover:text-gray-800"
            >
              Whispers
              {inboxUnread && inboxUnread > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary text-[10px] font-semibold text-white">
                  {inboxUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Settings
            </button>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500">
              Log Out
            </button>
          </div>
        </header>

        <main className="w-full max-w-md mt-4">
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
            <div className="space-y-4">
              {feedProfiles.map((p) => (
                <FeedCard
                  key={p.uid}
                  profile={p}
                  onPass={() => handlePass(p.uid)}
                  onWhisper={() => setActiveWhisperTarget(p)}
                />
              ))}
              {typeof remainingQuota === "number" && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  You can discover {remainingQuota} more profiles today.
                </p>
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

  const handleReveal = () => {
    setRevealed(true);
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-lg neo-border">
      <div className="flex flex-col gap-3">
        <div
          className="w-full h-56 rounded-xl overflow-hidden relative cursor-pointer"
          onClick={handleReveal}
        >
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className={`w-full h-full object-cover transition-all duration-300 ${
                revealed ? "" : "blur-lg scale-105"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
              No photo
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg text-gray-900">
              {profile.displayName}, {profile.age}
            </h2>
            <p className="text-xs text-gray-500">{profile.location.city}</p>
          </div>
        </div>
        <p className="text-sm text-gray-700">{profile.bio}</p>
        {profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {profile.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="px-2 py-1 text-xs rounded-full bg-pink-50 text-pink-700 border border-pink-100"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-between items-center">
          <button
            className="px-4 py-2 rounded-lg bg-primary text-white neo-border text-sm font-semibold hover:brightness-110 transition"
            type="button"
            onClick={onWhisper}
          >
            Whisper Hi
          </button>
          <button
            onClick={onPass}
            className="px-3 py-2 rounded-lg bg-white neo-border text-sm text-gray-700 hover:bg-gray-50 transition"
            type="button"
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  );
}
