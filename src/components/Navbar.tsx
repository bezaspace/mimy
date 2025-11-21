"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
    const { user, profile, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [inboxUnread, setInboxUnread] = useState<number | null>(null);

    useEffect(() => {
        const loadInboxUnread = async () => {
            if (!user) return;

            try {
                const idToken = await user.getIdToken();
                const response = await fetch("/api/whispers/inbox", {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                if (!response.ok) return;

                const data = await response.json();
                if (typeof data.unreadCount === "number") {
                    setInboxUnread(data.unreadCount);
                }
            } catch (error) {
                console.error("Error loading inbox unread count", error);
            }
        };

        if (user) {
            loadInboxUnread();
        }
    }, [user]);

    if (!profile) return null;

    const isActive = (path: string) => pathname === path;

    return (
        <>
            <header className="w-full max-w-md flex flex-col gap-4 p-4 bg-white rounded-xl shadow-sm mb-6">
                <div className="flex justify-between items-center">
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
                            <h1 className="font-bold text-gray-800">
                                {pathname === "/" ? "Discover" :
                                    pathname === "/matches" ? "Chats" :
                                        pathname === "/whispers" ? "Whispers" :
                                            pathname === "/settings" ? "Settings" : "Mimy"}
                            </h1>
                            <p className="text-xs text-gray-500">
                                {pathname === "/" ? profile.location.city :
                                    pathname === "/matches" ? "Your Conversations" :
                                        pathname === "/whispers" ? "Your incoming whispers" :
                                            pathname === "/settings" ? "Manage your profile" : ""}
                            </p>
                        </div>
                    </div>
                    <button onClick={logout} className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Log Out
                    </button>
                </div>

                {/* Top nav tabs for md+ screens */}
                <nav className="hidden md:flex items-center justify-between bg-gray-50 p-1 rounded-lg">
                    <button
                        onClick={() => router.push("/")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                            isActive("/")
                                ? "bg-white text-primary shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Discover
                    </button>
                    <button
                        onClick={() => router.push("/whispers")}
                        className={`relative flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                            isActive("/whispers")
                                ? "bg-white text-primary shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Whispers
                        {inboxUnread && inboxUnread > 0 && (
                            <span className="absolute top-1 right-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white">
                                {inboxUnread}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => router.push("/matches")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                            isActive("/matches")
                                ? "bg-white text-primary shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Chats
                    </button>
                    <button
                        onClick={() => router.push("/settings")}
                        className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                            isActive("/settings")
                                ? "bg-white text-primary shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Settings
                    </button>
                </nav>
            </header>

            {/* Bottom nav tabs for mobile screens */}
            <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-white/95 border-t border-black/10">
                <div className="mx-auto max-w-md flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => router.push("/")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            isActive("/")
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        Discover
                    </button>
                    <button
                        onClick={() => router.push("/whispers")}
                        className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            isActive("/whispers")
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        Whispers
                        {inboxUnread && inboxUnread > 0 && (
                            <span className="absolute top-1 right-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white">
                                {inboxUnread}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => router.push("/matches")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            isActive("/matches")
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        Chats
                    </button>
                    <button
                        onClick={() => router.push("/settings")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            isActive("/settings")
                                ? "bg-primary text-white shadow-md"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        Settings
                    </button>
                </div>
            </nav>
        </>
    );
}
