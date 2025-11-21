"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

interface InboxSender {
  uid: string;
  displayName: string;
  age: number;
  location: {
    city: string;
    country: string;
  };
  photoURL: string | null;
}

interface InboxItem {
  whisperId: string;
  audioUrl: string;
  createdAt: number;
  expiresAt: number | null;
  playedAt: number | null;
  sender: InboxSender;
}

export default function WhispersPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [openToWhispers, setOpenToWhispers] = useState<boolean | null>(null);
  const [activeItem, setActiveItem] = useState<InboxItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState<"approve" | "decline" | null>(null);
  const [hasScrolledProfile, setHasScrolledProfile] = useState(false);

  const profileScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (!loading && user && !profile) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadInbox = async () => {
      if (!user) return;

      setInboxLoading(true);
      setInboxError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/whispers/inbox", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load inbox");
        }

        const data = await response.json();

        setOpenToWhispers(Boolean(data.openToWhispers));
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error("Error loading inbox", error);
        setInboxError("Could not load your whispers right now.");
      } finally {
        setInboxLoading(false);
      }
    };

    if (user && profile) {
      loadInbox();
    }
  }, [user, profile]);

  useEffect(() => {
    if (!activeItem) {
      return;
    }

    const el = profileScrollRef.current;
    if (!el) {
      return;
    }

    if (el.scrollHeight <= el.clientHeight + 1) {
      setHasScrolledProfile(true);
    } else {
      setHasScrolledProfile(false);
    }
  }, [activeItem]);

  const handleOpenItem = (item: InboxItem) => {
    setActiveItem(item);
    setHasScrolledProfile(false);
    setIsPlaying(false);
  };

  const handleCloseOverlay = () => {
    setActiveItem(null);
    setHasScrolledProfile(false);
    setIsPlaying(false);
    setDecisionLoading(null);
  };

  const handleProfileScroll = () => {
    const el = profileScrollRef.current;
    if (!el || hasScrolledProfile) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 16) {
      setHasScrolledProfile(true);
    }
  };

  const handlePlay = async () => {
    if (!user || !activeItem || isPlaying) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/whispers/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ whisperId: activeItem.whisperId }),
      });

      if (!response.ok) {
        console.error("Failed to record play");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.whisperId === activeItem.whisperId && !item.playedAt
            ? { ...item, playedAt: Date.now() }
            : item,
        ),
      );

      setIsPlaying(true);
    } catch (error) {
      console.error("Error recording play", error);
    }
  };

  const handleDecision = async (decision: "approve" | "decline") => {
    if (!user || !activeItem || decisionLoading) return;

    setDecisionLoading(decision);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/whispers/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ whisperId: activeItem.whisperId, decision }),
      });

      if (!response.ok) {
        console.error("Failed to process decision");
        setDecisionLoading(null);
        return;
      }

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }

      setItems((prev) =>
        prev.filter((item) => item.whisperId !== activeItem.whisperId),
      );

      if (decision === "approve" && data && typeof data.matchId === "string") {
        handleCloseOverlay();
        router.push(`/matches/${data.matchId}`);
        return;
      }

      handleCloseOverlay();
    } catch (error) {
      console.error("Error processing decision", error);
      setDecisionLoading(null);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-pink-500 font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4">
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] bg-white neo-border rounded-2xl shadow-xl p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {activeItem.sender.photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeItem.sender.photoURL}
                    alt={activeItem.sender.displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                  />
                )}
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Whisper from
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {activeItem.sender.displayName}, {activeItem.sender.age}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activeItem.sender.location.city}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseOverlay}
                className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div
              ref={profileScrollRef}
              onScroll={handleProfileScroll}
              className="flex-1 overflow-y-auto border-t border-gray-200 pt-3 space-y-3"
            >
              <p className="text-xs font-semibold uppercase text-gray-500">
                Their Profile
              </p>
              <p className="text-sm text-gray-800">
                {activeItem.sender.displayName}, {activeItem.sender.age}
              </p>
              <p className="text-xs text-gray-500">
                {activeItem.sender.location.city}, {activeItem.sender.location.country}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Scroll through this section before playing the whisper.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-3">
              <button
                type="button"
                disabled={!hasScrolledProfile}
                onClick={handlePlay}
                className={`w-full px-4 py-2 rounded-lg text-sm font-semibold neo-border flex items-center justify-center gap-2 ${hasScrolledProfile
                  ? "bg-primary text-white hover:brightness-110"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
              >
                {hasScrolledProfile ? "Play Whisper" : "Scroll profile to unlock play"}
              </button>

              {isPlaying && (
                <audio
                  src={activeItem.audioUrl}
                  controls
                  className="w-full mt-1"
                  autoPlay
                />
              )}

              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => handleDecision("approve")}
                  disabled={decisionLoading === "approve"}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-500 text-white neo-border text-sm font-semibold hover:brightness-110 disabled:opacity-60"
                >
                  {decisionLoading === "approve" ? "Approving..." : "Yes, let's chat!"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("decline")}
                  disabled={decisionLoading === "decline"}
                  className="flex-1 px-4 py-2 rounded-lg bg-white text-red-500 neo-border text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  {decisionLoading === "decline" ? "Declining..." : "Not for me"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Navbar />

      <main className="w-full max-w-md mt-2">
        {openToWhispers === false && (
          <div className="bg-white p-4 rounded-2xl shadow-lg neo-border mb-4">
            <p className="text-sm text-gray-800 font-semibold mb-1">
              Whispers are turned off
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Turn on "Open to Whispers" in your settings to receive new whispers.
            </p>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="px-3 py-2 rounded-lg bg-primary text-white neo-border text-xs font-semibold hover:brightness-110"
            >
              Go to Settings
            </button>
          </div>
        )}

        {inboxLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-gray-500 text-sm">Loading your whispers...</div>
          </div>
        ) : inboxError ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg neo-border text-center">
            <p className="text-sm text-red-500">{inboxError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-lg neo-border text-center">
            <div className="text-6xl mb-4">🎧</div>
            <h2 className="text-2xl font-bold mb-2">No whispers yet</h2>
            <p className="text-gray-600 mb-2">
              When someone sends you a whisper, it will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.whisperId}
                type="button"
                onClick={() => handleOpenItem(item)}
                className="w-full text-left bg-white p-4 rounded-2xl shadow-lg neo-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {item.sender.photoURL && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.sender.photoURL}
                      alt={item.sender.displayName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.sender.displayName}, {item.sender.age}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.sender.location.city}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.playedAt ? "Played" : "New whisper"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-pink-600">Play?</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
