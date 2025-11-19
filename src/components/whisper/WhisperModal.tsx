"use client";

import type { FC } from "react";
import { useState } from "react";
import { AudioRecorder } from "@/components/whisper/AudioRecorder";
import { useAuth } from "@/context/AuthContext";
import { uploadWhisperAudio } from "@/lib/storage";

export interface WhisperModalProps {
  target: {
    uid: string;
    displayName: string;
    age: number;
    location: {
      city: string;
      country?: string;
    };
  };
  onClose: () => void;
}

export const WhisperModal: FC<WhisperModalProps> = ({ target, onClose }) => {
  const { user } = useAuth();
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleRecordingReady = (blob: Blob) => {
    setRecordingBlob(blob);
    setBlockedMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLimitMessage(null);
  };

  const handleSendRequested = async () => {
    if (!user || !recordingBlob || isChecking) {
      return;
    }

    setIsChecking(true);
    setBlockedMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLimitMessage(null);

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("audio", recordingBlob, "whisper.webm");

      const response = await fetch("/api/whispers/safety", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        setErrorMessage("We couldn't vibe check this right now. Please try again.");
        return;
      }

      if (data.ok && data.decision === "allow") {
        setBlockedMessage(null);
        setErrorMessage(null);

        try {
          const audioUrl = await uploadWhisperAudio(user.uid, recordingBlob);

          const sendResponse = await fetch("/api/whispers/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              receiverId: target.uid,
              audioUrl,
            }),
          });

          const sendData = await sendResponse.json().catch(() => null);

          if (!sendResponse.ok || !sendData) {
            setErrorMessage("We couldn't send this whisper. Please try again.");
            return;
          }

          if (sendData.ok) {
            setSuccessMessage("Whisper sent—fingers crossed!");
            return;
          }

          if (sendData.code === "LIMIT_EXCEEDED") {
            setLimitMessage(
              sendData.message ||
                "Daily whispers maxed—come back tomorrow for more magic!",
            );
            return;
          }

          setErrorMessage("We couldn't send this whisper. Please try again.");
          return;
        } catch (_uploadError) {
          setErrorMessage("We couldn't send this whisper. Please try again.");
          return;
        }
      }

      if (data.decision === "block") {
        setBlockedMessage(
          data.explanation ||
            data.reason ||
            "We picked up language that does not fit this app's vibe. Try a kinder whisper.",
        );
        return;
      }

      setErrorMessage("We couldn't vibe check this right now. Please try again.");
    } catch (_error) {
      setErrorMessage("We couldn't vibe check this right now. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] bg-white neo-border rounded-2xl shadow-xl p-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Whisper to</p>
            <p className="text-sm font-semibold text-gray-900">
              {target.displayName}, {target.age}
            </p>
            <p className="text-xs text-gray-500">{target.location.city}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white neo-border text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <AudioRecorder
            maxDurationMs={45000}
            onRecordingReady={handleRecordingReady}
            onSendRequested={handleSendRequested}
            isChecking={isChecking}
          />
        </div>
        {blockedMessage && (
          <p className="text-xs text-red-500 text-center">{blockedMessage}</p>
        )}
        {errorMessage && !blockedMessage && (
          <p className="text-xs text-red-500 text-center">{errorMessage}</p>
        )}
        {successMessage && !blockedMessage && !errorMessage && (
          <p className="text-xs text-green-600 text-center">{successMessage}</p>
        )}
        {limitMessage && !blockedMessage && !errorMessage && !successMessage && (
          <p className="text-xs text-gray-500 text-center">{limitMessage}</p>
        )}
      </div>
    </div>
  );
};
