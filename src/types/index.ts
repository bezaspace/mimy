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
  playedAt?: number | null; // Timestamp when receiver first played the whisper
  approvedAt?: number | null; // Timestamp when receiver approved the whisper
  declinedAt?: number | null; // Timestamp when receiver declined the whisper
  expiresAt: number; // Timestamp when whisper expires from inbox
}

export interface Match {
  id: string;
  whisperId: string;
  userAId: string; // Sender
  userBId: string; // Receiver
  createdAt: number; // Timestamp
  status: "active" | "closed";
  participantIds?: string[];
  lastMessage?: string | null;
  lastMessageAt?: number | null;
  lastMessageSenderId?: string | null;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  type: "text";
  text: string;
  createdAt: number; // Timestamp
}
