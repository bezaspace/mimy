import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * Path format: users/{uid}/photos/{filename}
 */
export const uploadProfileImage = async (uid: string, file: File): Promise<string> => {
  try {
    // Basic client-side validation
    if (!file.type.startsWith("image/")) {
      throw new Error("File is not an image");
    }
    
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds 5MB limit");
    }

    // Create a unique filename or use original name sanitized
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const storagePath = `users/${uid}/photos/${timestamp}_${safeName}`;
    
    const storageRef = ref(storage, storagePath);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export const uploadWhisperAudio = async (uid: string, blob: Blob): Promise<string> => {
	try {
		if (!blob.type.startsWith("audio/")) {
			throw new Error("File is not an audio clip");
		}

		if (blob.size > 10 * 1024 * 1024) {
			throw new Error("File size exceeds 10MB limit");
		}

		const timestamp = Date.now();
		const storagePath = `whispers/${uid}/${timestamp}.webm`;
		const storageRef = ref(storage, storagePath);

		const snapshot = await uploadBytes(storageRef, blob);
		const downloadURL = await getDownloadURL(snapshot.ref);

		return downloadURL;
	} catch (error) {
		console.error("Error uploading whisper audio:", error);
		throw error;
	}
};

/**
 * Simple utility to compress image before upload could go here.
 * For now, we rely on raw upload but enforce size limit above.
 */
