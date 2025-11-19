"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { uploadProfileImage } from "@/lib/storage";
import { processImage } from "@/lib/imageUtils";
import {
  AVAILABLE_INTERESTS,
  DEAL_BREAKERS,
} from "@/components/onboarding/steps/StepInterests";

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [localOpenToWhispers, setLocalOpenToWhispers] = useState<boolean>(
    profile?.isOpenToWhispers ?? true
  );
  const [isSavingSection, setIsSavingSection] = useState<string | null>(null);

  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditingBasics, setIsEditingBasics] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingInterests, setIsEditingInterests] = useState(false);

  const [localDisplayName, setLocalDisplayName] = useState(
    profile?.displayName ?? ""
  );
  const [localCity, setLocalCity] = useState(
    profile?.location?.city ?? ""
  );
  const [localBio, setLocalBio] = useState(profile?.bio ?? "");
  const [localInterests, setLocalInterests] = useState<string[]>(
    profile?.interests ?? []
  );
  const [localDealBreakers, setLocalDealBreakers] = useState<string[]>(
    profile?.dealBreakers ?? []
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setLocalOpenToWhispers(profile.isOpenToWhispers);
      setLocalDisplayName(profile.displayName);
      setLocalCity(profile.location?.city ?? "");
      setLocalBio(profile.bio ?? "");
      setLocalInterests(profile.interests ?? []);
      setLocalDealBreakers(profile.dealBreakers ?? []);
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

  const handleSaveBasics = async () => {
    if (!user || !profile) return;
    const trimmedName = localDisplayName.trim();
    if (!trimmedName) return;

    setIsSavingSection("basics");
    try {
      await updateUserProfile(user.uid, {
        displayName: trimmedName,
        location: {
          ...(profile.location || { city: "", country: "" }),
          city: localCity,
        },
      });
      await refreshProfile();
      setIsEditingBasics(false);
    } catch (err) {
      console.error("Error updating basic info", err);
    } finally {
      setIsSavingSection(null);
    }
  };

  const maxBioLength = 150;

  const handleSaveBio = async () => {
    if (!user) return;
    setIsSavingSection("bio");
    try {
      await updateUserProfile(user.uid, { bio: localBio });
      await refreshProfile();
      setIsEditingBio(false);
    } catch (err) {
      console.error("Error updating bio", err);
    } finally {
      setIsSavingSection(null);
    }
  };

  const toggleLocalInterest = (interest: string) => {
    setLocalInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((i) => i !== interest);
      }
      if (current.length >= 5) return current;
      return [...current, interest];
    });
  };

  const toggleLocalDealBreaker = (item: string) => {
    setLocalDealBreakers((current) => {
      if (current.includes(item)) {
        return current.filter((i) => i !== item);
      }
      if (current.length >= 3) return current;
      return [...current, item];
    });
  };

  const handleSaveInterests = async () => {
    if (!user) return;
    setIsSavingSection("interests");
    try {
      await updateUserProfile(user.uid, {
        interests: localInterests,
        dealBreakers: localDealBreakers,
      });
      await refreshProfile();
      setIsEditingInterests(false);
    } catch (err) {
      console.error("Error updating interests", err);
    } finally {
      setIsSavingSection(null);
    }
  };

  const handlePhotoFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUpdatingPhoto(true);
    try {
      const processed = await processImage(file);
      const url = await uploadProfileImage(user.uid, processed);

      const existing = profile.photoURLs || [];
      const updatedPhotoURLs =
        existing.length > 0 ? [url, ...existing.slice(1)] : [url];

      await updateUserProfile(user.uid, { photoURLs: updatedPhotoURLs });
      await refreshProfile();
    } catch (err) {
      console.error("Error updating profile photo", err);
    } finally {
      setIsUpdatingPhoto(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex justify-center">
      <div className="w-full max-w-2xl bg-white neo-border rounded-2xl p-6 shadow-lg space-y-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Your Profile</h1>

        {/* Profile photo section */}
        <section className="neo-border rounded-xl p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden neo-border bg-gray-200 flex items-center justify-center">
              {profile.photoURLs && profile.photoURLs.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoURLs[0]}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-gray-500 font-semibold">
                  No photo
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Profile Photo
              </p>
              <p className="text-xs text-gray-500">
                This is the main photo other users see.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdatingPhoto}
              className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100 disabled:opacity-60"
            >
              {isUpdatingPhoto ? "Updating..." : "Change"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
          </div>
        </section>

        {/* Basics / header section */}
        <section className="neo-border rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Basics</p>
              {!isEditingBasics ? (
                <div className="mt-1 space-y-1">
                  <p className="text-lg font-semibold text-gray-900">
                    {profile.displayName}
                  </p>
                  <p className="text-sm text-gray-700">
                    {profile.age} · {profile.gender} · {profile.orientation}
                  </p>
                  <p className="text-sm text-gray-600">
                    {profile.location?.city}, {profile.location?.country || "Unknown"}
                  </p>
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={localDisplayName}
                      onChange={(e) => setLocalDisplayName(e.target.value)}
                      className="mt-1 block w-full rounded-lg bg-white px-3 py-2 neo-border focus:ring-0 focus:bg-yellow-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600">
                      City
                    </label>
                    <input
                      type="text"
                      value={localCity}
                      onChange={(e) => setLocalCity(e.target.value)}
                      className="mt-1 block w-full rounded-lg bg-white px-3 py-2 neo-border focus:ring-0 focus:bg-yellow-50 text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Age, gender, orientation and country are fixed from onboarding for now.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {!isEditingBasics ? (
                <button
                  type="button"
                  onClick={() => setIsEditingBasics(true)}
                  className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBasics(false);
                      setLocalDisplayName(profile.displayName);
                      setLocalCity(profile.location?.city ?? "");
                    }}
                    className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                    disabled={isSavingSection === "basics"}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBasics}
                    className="px-3 py-1 rounded-lg bg-primary text-white neo-border text-xs font-semibold hover:brightness-110 disabled:opacity-60"
                    disabled={isSavingSection === "basics"}
                  >
                    {isSavingSection === "basics" ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bio section */}
        <section className="neo-border rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-gray-500">Bio</p>
              {!isEditingBio ? (
                <p className="mt-2 text-sm text-gray-800 whitespace-pre-line">
                  {profile.bio || "No bio added yet."}
                </p>
              ) : (
                <div className="mt-2">
                  <textarea
                    value={localBio}
                    onChange={(e) => {
                      if (e.target.value.length <= maxBioLength) {
                        setLocalBio(e.target.value);
                      }
                    }}
                    rows={4}
                    className="w-full rounded-lg bg-white px-3 py-2 neo-border focus:ring-0 focus:bg-yellow-50 text-sm resize-none"
                    placeholder="I'm an avid hiker and coffee lover..."
                  />
                  <div className="text-right text-[11px] font-semibold mt-1 text-gray-500">
                    <span
                      className={
                        localBio.length >= maxBioLength ? "text-primary" : ""
                      }
                    >
                      {localBio.length}
                    </span>
                    /{maxBioLength}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {!isEditingBio ? (
                <button
                  type="button"
                  onClick={() => setIsEditingBio(true)}
                  className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBio(false);
                      setLocalBio(profile.bio || "");
                    }}
                    className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                    disabled={isSavingSection === "bio"}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBio}
                    className="px-3 py-1 rounded-lg bg-primary text-white neo-border text-xs font-semibold hover:brightness-110 disabled:opacity-60"
                    disabled={isSavingSection === "bio"}
                  >
                    {isSavingSection === "bio" ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Interests & deal breakers section */}
        <section className="neo-border rounded-xl p-4 bg-gray-50 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Interests
                </p>
                {!isEditingInterests ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(profile.interests || []).length === 0 && (
                      <p className="text-xs text-gray-500">
                        No interests selected yet.
                      </p>
                    )}
                    {(profile.interests || []).map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 rounded-full bg-secondary text-foreground border border-black text-xs font-semibold"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {AVAILABLE_INTERESTS.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleLocalInterest(interest)}
                        className={`px-3 py-1 rounded-full border-2 text-xs font-semibold transition-all active:translate-y-0.5 ${
                          localInterests.includes(interest)
                            ? "bg-secondary text-foreground border-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                            : "bg-white text-gray-600 border-gray-300 hover:border-black hover:text-black"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Deal Breakers
                </p>
                {!isEditingInterests ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(profile.dealBreakers || []).length === 0 && (
                      <p className="text-xs text-gray-500">
                        No deal breakers selected yet.
                      </p>
                    )}
                    {(profile.dealBreakers || []).map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1 rounded-full bg-primary text-white border border-black text-xs font-semibold"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DEAL_BREAKERS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleLocalDealBreaker(item)}
                        className={`px-3 py-1 rounded-full border-2 text-xs font-semibold transition-all active:translate-y-0.5 ${
                          localDealBreakers.includes(item)
                            ? "bg-primary text-white border-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                            : "bg-white text-gray-600 border-gray-300 hover:border-black hover:text-black"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {!isEditingInterests ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingInterests(true);
                    setLocalInterests(profile.interests || []);
                    setLocalDealBreakers(profile.dealBreakers || []);
                  }}
                  className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingInterests(false);
                      setLocalInterests(profile.interests || []);
                      setLocalDealBreakers(profile.dealBreakers || []);
                    }}
                    className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                    disabled={isSavingSection === "interests"}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInterests}
                    className="px-3 py-1 rounded-lg bg-primary text-white neo-border text-xs font-semibold hover:brightness-110 disabled:opacity-60"
                    disabled={isSavingSection === "interests"}
                  >
                    {isSavingSection === "interests" ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Discovery / Open to Whispers section */}
        <section className="neo-border rounded-xl p-4 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Discovery
            </p>
            <p className="mt-1 font-medium text-gray-800">Open to Whispers</p>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              When this is off, other users will not see you in their discovery feed.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleOpen}
            disabled={isSaving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
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
        </section>
      </div>
    </div>
  );
}
