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
import Navbar from "@/components/Navbar";

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
  const [isEditingPhotos, setIsEditingPhotos] = useState(false);

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

  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.photoURLs) {
      setLocalPhotos(profile.photoURLs);
    }
  }, [profile?.photoURLs]);

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newPhotos = [...localPhotos];
    const draggedItem = newPhotos[draggedItemIndex];

    // Remove dragged item
    newPhotos.splice(draggedItemIndex, 1);
    // Insert at new position
    newPhotos.splice(index, 0, draggedItem);

    setLocalPhotos(newPhotos);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedItemIndex(null);
    if (!user) return;

    try {
      // Save the new order
      await updateUserProfile(user.uid, { photoURLs: localPhotos });
      await refreshProfile();
    } catch (err) {
      console.error("Error saving photo order", err);
      // Revert on error (optional, but good practice)
      if (profile?.photoURLs) {
        setLocalPhotos(profile.photoURLs);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex flex-col items-center">
      <Navbar />
      <div className="w-full max-w-md bg-white neo-border rounded-2xl p-6 shadow-lg space-y-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Your Profile</h1>

        {/* Photos section */}
        <section className="neo-border rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Photos
              </p>
              {!isEditingPhotos ? (
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden neo-border bg-gray-200 flex items-center justify-center">
                    {localPhotos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={localPhotos[0]}
                        alt="Main profile photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 font-semibold">
                        No photo
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {localPhotos.length} {localPhotos.length === 1 ? 'photo' : 'photos'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {localPhotos.length === 0 ? 'Add photos to your profile' : 'Manage your profile photos'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">
                      Add up to 5 photos. Drag to reorder.
                    </p>
                    <div className="text-xs font-semibold text-gray-500">
                      {localPhotos.length}/5
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {localPhotos.map((url, index) => (
                      <div
                        key={url}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden neo-border bg-gray-200 group cursor-grab active:cursor-grabbing transition-all duration-200 ${draggedItemIndex === index ? "opacity-40 scale-95" : "hover:scale-[1.02]"
                          }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Profile photo ${index + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                        />

                        {/* Overlay controls */}
                        <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 ${draggedItemIndex === index ? 'hidden' : ''}`}>
                          <div className="flex justify-end w-full">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!user) return;
                                const newPhotos = [...localPhotos];
                                newPhotos.splice(index, 1);
                                setLocalPhotos(newPhotos);
                                try {
                                  await updateUserProfile(user.uid, { photoURLs: newPhotos });
                                  await refreshProfile();
                                } catch (err) {
                                  console.error("Error deleting photo", err);
                                }
                              }}
                              className="p-1 bg-white/90 rounded-full hover:bg-red-50 text-red-500"
                              title="Delete photo"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            MAIN
                          </div>
                        )}
                      </div>
                    ))}

                    {localPhotos.length < 5 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUpdatingPhoto}
                        className="aspect-[3/4] rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-gray-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                          {isUpdatingPhoto ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-primary">
                              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-500 group-hover:text-primary">Add Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {!isEditingPhotos ? (
                <button
                  type="button"
                  onClick={() => setIsEditingPhotos(true)}
                  className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPhotos(false)}
                  className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
                >
                  Done
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              if (!user) return;
              const file = e.target.files?.[0];
              if (!file) return;

              setIsUpdatingPhoto(true);
              try {
                const processed = await processImage(file);
                const url = await uploadProfileImage(user.uid, processed);

                const existing = profile.photoURLs || [];
                const updatedPhotoURLs = [...existing, url];

                await updateUserProfile(user.uid, { photoURLs: updatedPhotoURLs });
                await refreshProfile();
              } catch (err) {
                console.error("Error updating profile photo", err);
              } finally {
                setIsUpdatingPhoto(false);
                if (e.target) {
                  e.target.value = "";
                }
              }
            }}
          />
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
                        className={`px-3 py-1 rounded-full border-2 text-xs font-semibold transition-all active:translate-y-0.5 ${localInterests.includes(interest)
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
                        className={`px-3 py-1 rounded-full border-2 text-xs font-semibold transition-all active:translate-y-0.5 ${localDealBreakers.includes(item)
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
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${localOpenToWhispers
              ? "bg-primary border-primary"
              : "bg-gray-200 border-gray-300"
              }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${localOpenToWhispers ? "translate-x-5" : "translate-x-1"
                }`}
            />
          </button>
        </section>

        <section className="neo-border rounded-xl p-4 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Insights</p>
            <p className="mt-1 font-medium text-gray-800">My Whispers</p>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              See how many of your whispers have been played or approved.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/my-whispers")}
            className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold hover:bg-gray-100"
          >
            Open
          </button>
        </section>
      </div>
    </div>
  );
}
