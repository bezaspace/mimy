"use client";

import type { FC } from "react";
import { AudioRecorder } from "@/components/whisper/AudioRecorder";

export interface WhisperModalProps {
  target: {
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
          <AudioRecorder maxDurationMs={45000} />
        </div>
      </div>
    </div>
  );
};
