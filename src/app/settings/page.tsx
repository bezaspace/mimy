"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/lib/firestore";

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [localOpenToWhispers, setLocalOpenToWhispers] = useState<boolean>(
    profile?.isOpenToWhispers ?? true
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setLocalOpenToWhispers(profile.isOpenToWhispers);
    }
  }, [profile]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-pink-500 font-medium">Loading...</div>
      </div>
    );
  }

  const handleToggleOpen = async () => {
    if (!user) return;
    const next = !localOpenToWhispers;
    setLocalOpenToWhispers(next);
    setIsSaving(true);
    try {
      await updateUserProfile(user.uid, { isOpenToWhispers: next });
      await refreshProfile();
    } catch (err) {
      console.error("Error updating profile", err);
      setLocalOpenToWhispers(!next);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex justify-center">
      <div className="w-full max-w-md bg-white neo-border rounded-2xl p-6 shadow-lg">
        <h1 className="text-xl font-bold mb-4 text-gray-900">Profile Settings</h1>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-gray-800">Open to Whispers</p>
            <p className="text-xs text-gray-500">
              When off, other users will not see you in their discovery feed.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleOpen}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
              localOpenToWhispers
                ? "bg-primary border-primary"
                : "bg-gray-200 border-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                localOpenToWhispers ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
