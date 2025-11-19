import React from 'react';
import { OnboardingFormData } from '@/types';

interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
}

export const StepBasicInfo: React.FC<StepProps> = ({ formData, updateFormData }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">The Basics</h2>
        <p className="text-gray-600">Let's start with who you are.</p>
      </div>

      <label className="block">
        <span className="text-sm font-bold uppercase tracking-wide">Display Name</span>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) => updateFormData({ displayName: e.target.value })}
          className="mt-2 block w-full rounded-lg bg-white px-4 py-3 neo-border focus:ring-0 focus:bg-yellow-50 transition-colors"
          placeholder="What should we call you?"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold uppercase tracking-wide">Age</span>
        <input
          type="number"
          value={formData.age}
          onChange={(e) => updateFormData({ age: e.target.value })}
          className="mt-2 block w-full rounded-lg bg-white px-4 py-3 neo-border focus:ring-0 focus:bg-yellow-50 transition-colors"
          placeholder="18+"
        />
        {parseInt(formData.age) < 18 && formData.age !== "" && (
          <div className="mt-2 p-2 bg-primary text-white text-xs font-bold rounded border-2 border-black inline-block">
            Must be 18+
          </div>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-bold uppercase tracking-wide">Gender</span>
        <div className="relative mt-2">
          <select
            value={formData.gender}
            onChange={(e) => updateFormData({ gender: e.target.value })}
            className="block w-full rounded-lg bg-white px-4 py-3 neo-border focus:ring-0 focus:bg-yellow-50 appearance-none cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Non-binary">Non-binary</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-bold uppercase tracking-wide">Orientation</span>
        <div className="relative mt-2">
            <select
            value={formData.orientation}
            onChange={(e) => updateFormData({ orientation: e.target.value })}
            className="block w-full rounded-lg bg-white px-4 py-3 neo-border focus:ring-0 focus:bg-yellow-50 appearance-none cursor-pointer"
            >
            <option value="">Select...</option>
            <option value="Straight">Straight</option>
            <option value="Gay">Gay</option>
            <option value="Lesbian">Lesbian</option>
            <option value="Bisexual">Bisexual</option>
            <option value="Pansexual">Pansexual</option>
            <option value="Asexual">Asexual</option>
            <option value="Other">Other</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
            </div>
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-bold uppercase tracking-wide">City</span>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => updateFormData({ city: e.target.value })}
          className="mt-2 block w-full rounded-lg bg-white px-4 py-3 neo-border focus:ring-0 focus:bg-yellow-50 transition-colors"
          placeholder="e.g. New York"
        />
      </label>
    </div>
  );
};
