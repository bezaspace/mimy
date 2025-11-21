"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { UserProfile } from "@/types";

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const uid = typeof params?.uid === "string" ? params.uid : Array.isArray(params?.uid) ? params.uid[0] : "";

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user || !uid) return;

            try {
                const idToken = await user.getIdToken();
                const response = await fetch(`/api/users/${uid}`, {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        setError("User not found");
                    } else {
                        setError("Failed to load profile");
                    }
                    return;
                }

                const data = await response.json();
                setProfile(data);
            } catch (err) {
                console.error("Error fetching profile", err);
                setError("Could not load profile right now.");
            } finally {
                setPageLoading(false);
            }
        };

        if (user && uid) {
            fetchProfile();
        }
    }, [user, uid]);

    if (loading || pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-pink-500 font-medium">Loading profile...</div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
                <Navbar />
                <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg neo-border text-center max-w-md w-full">
                    <p className="text-red-500 mb-4">{error || "Profile not found"}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded-lg bg-primary text-white neo-border text-sm font-semibold hover:brightness-110"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const photos = profile.photoURLs && profile.photoURLs.length > 0 ? profile.photoURLs : [];

    return (
        <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4 pb-24">
            <Navbar />

            <main className="w-full max-w-md mt-4 space-y-6">
                {/* Header / Back Button */}
                <div className="flex items-center">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        <span className="font-medium">Back</span>
                    </button>
                </div>

                {/* Photos */}
                <div className="bg-white rounded-3xl shadow-lg neo-border overflow-hidden">
                    <div className="relative aspect-[3/4] bg-gray-100">
                        {photos.length > 0 ? (
                            <img
                                src={photos[activePhotoIndex]}
                                alt={profile.displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No photos
                            </div>
                        )}

                        {/* Photo Navigation Dots */}
                        {photos.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                                {photos.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActivePhotoIndex(idx);
                                        }}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === activePhotoIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                                            }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Navigation Areas */}
                        {photos.length > 1 && (
                            <>
                                <div
                                    className="absolute inset-y-0 left-0 w-1/3 cursor-pointer"
                                    onClick={() => setActivePhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
                                />
                                <div
                                    className="absolute inset-y-0 right-0 w-1/3 cursor-pointer"
                                    onClick={() => setActivePhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
                                />
                            </>
                        )}
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {profile.displayName}, {profile.age}
                            </h1>
                            <div className="flex items-center gap-2 text-gray-600 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                <span>{profile.location.city}, {profile.location.country}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                                    {profile.gender}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                                    {profile.orientation}
                                </span>
                            </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">About Me</h2>
                                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                            </div>
                        )}

                        {/* Interests */}
                        {profile.interests && profile.interests.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">Interests</h2>
                                <div className="flex flex-wrap gap-2">
                                    {profile.interests.map((interest) => (
                                        <span
                                            key={interest}
                                            className="px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 border border-pink-100 text-sm font-medium"
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Deal Breakers */}
                        {profile.dealBreakers && profile.dealBreakers.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">Deal Breakers</h2>
                                <div className="flex flex-wrap gap-2">
                                    {profile.dealBreakers.map((db) => (
                                        <span
                                            key={db}
                                            className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium"
                                        >
                                            {db}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
