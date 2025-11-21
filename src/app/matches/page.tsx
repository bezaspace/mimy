"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Match, UserProfile } from "@/types";
import Navbar from "@/components/Navbar";

interface MatchListItem {
  id: string;
  match: Match;
  otherUser: {
    uid: string;
    displayName: string;
    age: number;
    location: {
      city: string;
      country: string;
    };
    photoURL: string | null;
  } | null;
}

export default function MatchesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<MatchListItem[]>([]);
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
    if (!loading && user && !profile) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  const handleDelete = async (matchId: string) => {
    if (!user || !confirm("Are you sure you want to delete this chat?")) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/matches/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ matchId }),
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== matchId));
      } else {
        alert("Failed to delete chat. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting chat", err);
      alert("An error occurred.");
    }
  };

  useEffect(() => {
    const loadMatches = async () => {
      if (!user) return;

      setPageLoading(true);
      setError(null);

      try {
        const matchesRef = collection(db, "matches");
        const q = query(matchesRef, where("participantIds", "array-contains", user.uid));
        const snapshot = await getDocs(q);

        const rawMatches: Match[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          rawMatches.push({
            id: data.id || docSnap.id,
            whisperId: data.whisperId,
            userAId: data.userAId,
            userBId: data.userBId,
            createdAt: data.createdAt,
            status: data.status,
            participantIds: data.participantIds,
            lastMessage: data.lastMessage ?? null,
            lastMessageAt: data.lastMessageAt ?? null,
            lastMessageSenderId: data.lastMessageSenderId ?? null,
          });
        });

        rawMatches.sort((a, b) => {
          const aTime = a.lastMessageAt ?? a.createdAt;
          const bTime = b.lastMessageAt ?? b.createdAt;
          return bTime - aTime;
        });

        const otherUserIds = new Set<string>();
        rawMatches.forEach((m) => {
          const otherId = m.userAId === user.uid ? m.userBId : m.userAId;
          otherUserIds.add(otherId);
        });

        const otherUsers: Record<string, UserProfile | null> = {};

        await Promise.all(
          Array.from(otherUserIds).map(async (otherId) => {
            const docRef = collection(db, "users");
            const snap = await getDocs(query(docRef, where("uid", "==", otherId)));
            if (!snap.empty) {
              const d = snap.docs[0].data() as UserProfile;
              otherUsers[otherId] = d;
            } else {
              otherUsers[otherId] = null;
            }
          }),
        );

        const listItems: MatchListItem[] = rawMatches.map((m) => {
          const otherId = m.userAId === user.uid ? m.userBId : m.userAId;
          const otherProfile = otherUsers[otherId];

          return {
            id: m.id,
            match: m,
            otherUser: otherProfile
              ? {
                uid: otherProfile.uid,
                displayName: otherProfile.displayName,
                age: otherProfile.age,
                location: otherProfile.location,
                photoURL:
                  Array.isArray(otherProfile.photoURLs) && otherProfile.photoURLs.length > 0
                    ? otherProfile.photoURLs[0]
                    : null,
              }
              : null,
          };
        });

        setItems(listItems);
      } catch (err) {
        console.error("Error loading matches", err);
        setError("Could not load your matches right now.");
      } finally {
        setPageLoading(false);
      }
    };

    if (user && profile) {
      loadMatches();
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
      <Navbar />

      <main className="w-full max-w-md mt-2">
        {pageLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-gray-500 text-sm">Loading your matches...</div>
          </div>
        ) : error ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg neo-border text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-lg neo-border text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-bold mb-2">No chats yet</h2>
            <p className="text-gray-600 mb-2">
              Approve a whisper to start your first conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(`/matches/${item.id}`)}
                className="w-full text-left bg-white p-4 rounded-2xl shadow-lg neo-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {item.otherUser?.photoURL && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.otherUser.photoURL}
                      alt={item.otherUser.displayName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.otherUser?.displayName ?? "Match"}
                      {item.otherUser?.age ? `, ${item.otherUser.age}` : ""}
                    </p>
                    {item.otherUser?.location?.city && (
                      <p className="text-xs text-gray-500">
                        {item.otherUser.location.city}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {item.match.lastMessage
                        ? item.match.lastMessage
                        : "Say hi with a message"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-pink-600">Chat</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
