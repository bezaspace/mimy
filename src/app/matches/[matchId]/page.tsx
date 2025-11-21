"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Match, Message, UserProfile } from "@/types";

interface ChatMessage extends Message { }

export default function MatchChatPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = typeof params?.matchId === "string" ? params.matchId : Array.isArray(params?.matchId) ? params.matchId[0] : "";

  const [match, setMatch] = useState<Match | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (!loading && user && !profile) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      if (!user || !matchId) {
        return;
      }

      try {
        const matchRef = doc(db, "matches", matchId);
        const matchSnap = await getDoc(matchRef);

        if (!matchSnap.exists()) {
          setError("Match not found.");
          setPageLoading(false);
          return;
        }

        const data = matchSnap.data() as any;
        const loadedMatch: Match = {
          id: data.id || matchSnap.id,
          whisperId: data.whisperId,
          userAId: data.userAId,
          userBId: data.userBId,
          createdAt: data.createdAt,
          status: data.status,
          participantIds: data.participantIds,
          lastMessage: data.lastMessage ?? null,
          lastMessageAt: data.lastMessageAt ?? null,
          lastMessageSenderId: data.lastMessageSenderId ?? null,
        };

        if (loadedMatch.userAId !== user.uid && loadedMatch.userBId !== user.uid) {
          setError("You are not a participant in this match.");
          setPageLoading(false);
          return;
        }

        setMatch(loadedMatch);

        const otherUserId = loadedMatch.userAId === user.uid ? loadedMatch.userBId : loadedMatch.userAId;
        const otherUserRef = doc(db, "users", otherUserId);
        const otherSnap = await getDoc(otherUserRef);

        if (otherSnap.exists()) {
          setOtherUser(otherSnap.data() as UserProfile);
        } else {
          setOtherUser(null);
        }

        const messagesRef = collection(db, "matches", matchId, "messages");
        const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

        unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const loadedMessages: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            const msgData = docSnap.data() as any;
            loadedMessages.push({
              id: docSnap.id,
              matchId,
              senderId: msgData.senderId,
              receiverId: msgData.receiverId,
              type: "text",
              text: msgData.text || "",
              createdAt: msgData.createdAt,
            });
          });
          setMessages(loadedMessages);
          setTimeout(() => {
            if (bottomRef.current) {
              bottomRef.current.scrollIntoView({ behavior: "smooth" });
            }
          }, 50);
        });

        setPageLoading(false);
      } catch (err) {
        console.error("Error loading match chat", err);
        setError("Could not load this chat right now.");
        setPageLoading(false);
      }
    };

    if (user && profile && matchId) {
      init();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, profile, matchId]);

  const handleSend = async () => {
    if (!user || !match || !otherUser || !input.trim() || sending) return;

    const text = input.trim();
    setSending(true);

    try {
      const now = Date.now();
      const messagesRef = collection(db, "matches", match.id, "messages");
      await addDoc(messagesRef, {
        matchId: match.id,
        senderId: user.uid,
        receiverId: match.userAId === user.uid ? match.userBId : match.userAId,
        type: "text",
        text,
        createdAt: now,
      });
      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, {
        lastMessage: text,
        lastMessageAt: now,
        lastMessageSenderId: user.uid,
      });

      setInput("");
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error("Error sending message", err);
    } finally {
      setSending(false);
    }
  };

  if (loading || !user || !profile || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-pink-500 font-medium">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white neo-border rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/matches")}
            className="px-4 py-2 rounded-lg bg-primary text-white neo-border text-sm font-semibold hover:brightness-110"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  const otherDisplayName = otherUser?.displayName ?? "Match";
  const otherPhoto =
    otherUser?.photoURLs && otherUser.photoURLs.length > 0 ? otherUser.photoURLs[0] : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4">
      <header className="w-full max-w-md flex justify-between items-center p-4 bg-white rounded-xl shadow-sm mb-2">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            if (otherUser) {
              router.push(`/profile/${otherUser.uid}`);
            }
          }}
        >
          {otherPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={otherPhoto}
              alt={otherDisplayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
            />
          )}
          <div>
            <h1 className="font-bold text-gray-800 text-sm flex items-center gap-1">
              Chat with {otherDisplayName}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-400">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </h1>
            {otherUser?.location?.city && (
              <p className="text-xs text-gray-500">{otherUser.location.city}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/matches")}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Back
        </button>
      </header>

      <main className="w-full max-w-md flex-1 flex flex-col bg-white neo-border rounded-2xl shadow-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-gray-400 mt-4">
              No messages yet. Say hi and keep it kind.
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId === user?.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-snug ${isMine
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-gray-200 p-3 flex items-center gap-2 bg-gray-50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-xl bg-primary text-white neo-border text-sm font-semibold hover:brightness-110 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
