export interface UserProfile {
  uid: string;
  displayName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | '';
  orientation: 'Straight' | 'Gay' | 'Lesbian' | 'Bisexual' | 'Pansexual' | 'Asexual' | 'Other' | '';
  location: {
    city: string;
    country: string;
    lat?: number; // Optional for now, maybe used later for distance
    lng?: number;
  };
  bio: string;
  interests: string[];
  dealBreakers: string[];
  photoURLs: string[];
  isProfileComplete: boolean;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  dailyWhisperCount: number;
  lastWhisperDate: number | null; // Timestamp of last sent whisper to reset count
  isOpenToWhispers: boolean;
  feedDay?: string | null;
  feedServedCount?: number;
  seenUserIds?: string[];
}

export interface OnboardingFormData {
  displayName: string;
  age: string; // kept as string for input handling, converted to number on save
  gender: string;
  orientation: string;
  city: string;
  bio: string;
  interests: string[];
  dealBreakers: string[];
  photoFiles: File[]; // For handling uploads
  photoPreviews: string[]; // For showing previews
}

export interface Whisper {
  id: string;
  senderId: string;
  receiverId: string;
  audioUrl: string;
  status: "pending" | "approved" | "declined" | "expired";
  createdAt: number; // Timestamp
}
