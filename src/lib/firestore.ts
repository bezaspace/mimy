import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "@/types";

export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, "users", uid);
  
  const now = Date.now();

  const newProfile: UserProfile = {
    uid,
    displayName: data.displayName || "",
    age: data.age || 0,
    gender: data.gender || "",
    orientation: data.orientation || "",
    location: data.location || { city: "", country: "" },
    bio: data.bio || "",
    interests: data.interests || [],
    dealBreakers: data.dealBreakers || [],
    photoURLs: data.photoURLs || [],
    isProfileComplete: true,
    createdAt: now,
    updatedAt: now,
    dailyWhisperCount: 0,
    lastWhisperDate: null,
    isOpenToWhispers: true,
    feedDay: null,
    feedServedCount: 0,
    seenUserIds: [],
  };

  try {
    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
