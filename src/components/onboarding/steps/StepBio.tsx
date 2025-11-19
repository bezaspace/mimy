import React from 'react';
import { OnboardingFormData } from '@/types';

interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
}

export const StepBio: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const maxLength = 150;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">Your Bio</h2>
        <p className="text-gray-600">Say something about yourself. Keep it short.</p>
      </div>

      <div className="relative">
        <textarea
          value={formData.bio}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              updateFormData({ bio: e.target.value });
            }
          }}
          rows={6}
          className="w-full rounded-lg bg-white px-4 py-3 neo-border focus:ring-0 focus:bg-yellow-50 resize-none text-lg leading-relaxed"
          placeholder="I'm an avid hiker and coffee lover..."
        />
        <div className="text-right text-sm font-bold mt-2 text-gray-500">
          <span className={formData.bio.length >= maxLength ? "text-primary" : ""}>
            {formData.bio.length}
          </span>
          /{maxLength}
        </div>
      </div>
    </div>
  );
};
