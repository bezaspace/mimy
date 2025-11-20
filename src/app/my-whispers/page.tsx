"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface MyWhispersReceiver {
  uid: string;
  displayName: string;
  age: number;
  location: {
    city: string;
    country: string;
  };
  photoURL: string | null;
}

interface MyWhisperItem {
  id: string;
  receiver: MyWhispersReceiver;
  status: "pending" | "approved" | "declined" | "expired";
  createdAt: number;
  playedAt: number | null;
  approvedAt: number | null;
  declinedAt: number | null;
  expiresAt: number | null;
}

interface MyWhispersSummary {
  totalSent: number;
  totalPlayed: number;
  totalApproved: number;
}

export default function MyWhispersPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<MyWhisperItem[]>([]);
  const [summary, setSummary] = useState<MyWhispersSummary | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (!loading && user && !profile) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadMyWhispers = async () => {
      if (!user) return;

      setPageLoading(true);
      setError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch("/api/whispers/my", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load whispers");
        }

        const data = await response.json();

        setItems(Array.isArray(data.items) ? data.items : []);
        setSummary(data.summary || null);
      } catch (err) {
        console.error("Error loading my whispers", err);
        setError("Could not load your whispers right now.");
      } finally {
        setPageLoading(false);
      }
    };

    if (user && profile) {
      loadMyWhispers();
    }
  }, [user, profile]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-pink-500 font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4">
      <header className="w-full max-w-md flex justify-between items-center p-4 bg-white rounded-xl shadow-sm mb-6">
        <div className="flex items-center gap-3">
          {profile.photoURLs[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoURLs[0]}
              alt={profile.displayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
            />
          )}
          <div>
            <h1 className="font-bold text-gray-800">My Whispers</h1>
            <p className="text-xs text-gray-500">How your whispers are doing</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Back to Discover
        </button>
      </header>

      <main className="w-full max-w-md mt-2 space-y-4">
        {summary && (
          <div className="bg-white p-4 rounded-2xl shadow-lg neo-border flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                This Week's Vibes
              </p>
              <p className="text-sm text-gray-800 mt-1">
                {summary.totalSent} whispers sent
              </p>
            </div>
            <div className="text-right text-xs text-gray-600 space-y-1">
              <p>
                Played: <span className="font-semibold">{summary.totalPlayed}</span>
              </p>
              <p>
                Approved: <span className="font-semibold">{summary.totalApproved}</span>
              </p>
            </div>
          </div>
        )}

        {pageLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-gray-500 text-sm">Loading your whispers...</div>
          </div>
        ) : error ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg neo-border text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-lg neo-border text-center">
            <div className="text-6xl mb-4">💌</div>
            <h2 className="text-2xl font-bold mb-2">No whispers sent yet</h2>
            <p className="text-gray-600 mb-2">
              Once you start whispering, you can track how your clips are doing here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl shadow-lg neo-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {item.receiver.photoURL && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.receiver.photoURL}
                      alt={item.receiver.displayName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.receiver.displayName}, {item.receiver.age}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.receiver.location.city}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.status === "pending" && "Pending"}
                      {item.status === "approved" && "Approved"}
                      {item.status === "declined" && "Declined"}
                      {item.status === "expired" && "Expired"}
                      {item.playedAt && item.status === "pending" && " · Played"}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-gray-400">
                  {item.createdAt ? (
                    <span>Sent</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
