import React from 'react';
import { OnboardingFormData } from '@/types';

interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
}

export const AVAILABLE_INTERESTS = [
  "Hiking", "Coffee", "Books", "Music", "Travel", "Foodie", "Gym", 
  "Gaming", "Art", "Movies", "Tech", "Nature", "Cooking", "Dancing", 
  "Photography", "Pets", "Yoga", "Politics", "Fashion", "History"
];

export const DEAL_BREAKERS = [
  "Smoking", "Drugs", "Kids", "Pets", "Politics", "Religion"
];

export const StepInterests: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const toggleInterest = (interest: string) => {
    const current = formData.interests;
    if (current.includes(interest)) {
      updateFormData({ interests: current.filter(i => i !== interest) });
    } else {
      if (current.length >= 5) return; // Max 5
      updateFormData({ interests: [...current, interest] });
    }
  };

  const toggleDealBreaker = (item: string) => {
    const current = formData.dealBreakers;
    if (current.includes(item)) {
      updateFormData({ dealBreakers: current.filter(i => i !== item) });
    } else {
      if (current.length >= 3) return; // Max 3
      updateFormData({ dealBreakers: [...current, item] });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">Interests</h2>
        <p className="text-gray-600 mb-4">Pick up to 5 things you love.</p>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all active:translate-y-0.5 ${
                formData.interests.includes(interest)
                  ? 'bg-secondary text-foreground border-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-black hover:text-black'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t-2 border-gray-100">
        <h2 className="text-3xl font-serif font-bold text-foreground">Deal Breakers</h2>
        <p className="text-gray-600 mb-4">Pick up to 3 things you avoid.</p>
        <div className="flex flex-wrap gap-3">
          {DEAL_BREAKERS.map((item) => (
            <button
              key={item}
              onClick={() => toggleDealBreaker(item)}
              className={`px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all active:translate-y-0.5 ${
                formData.dealBreakers.includes(item)
                  ? 'bg-primary text-white border-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-black hover:text-black'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
