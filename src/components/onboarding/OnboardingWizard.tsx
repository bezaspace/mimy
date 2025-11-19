"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingFormData } from '@/types';
import { StepBasicInfo } from './steps/StepBasicInfo';
import { StepInterests } from './steps/StepInterests';
import { StepBio } from './steps/StepBio';
import { StepPhotos } from './steps/StepPhotos';
import { useAuth } from '@/context/AuthContext';
import { createUserProfile } from '@/lib/firestore';
import { uploadProfileImage } from '@/lib/storage';
import { processImage } from '@/lib/imageUtils';

export const OnboardingWizard = () => {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    displayName: user?.displayName || "",
    age: "",
    gender: "",
    orientation: "",
    city: "",
    bio: "",
    interests: [],
    dealBreakers: [],
    photoFiles: [],
    photoPreviews: []
  });

  const updateFormData = (data: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    // Validation logic per step
    if (currentStep === 1) {
      if (!formData.displayName || !formData.age || !formData.gender || !formData.orientation || !formData.city) {
        alert("Please fill in all fields.");
        return;
      }
      if (parseInt(formData.age) < 18) {
        alert("You must be at least 18 years old.");
        return;
      }
    }
    if (currentStep === 2) {
      if (formData.interests.length === 0) {
        alert("Please select at least one interest.");
        return;
      }
    }
    // No validation needed for Bio (optional but recommended)
    // if (currentStep === 3) { } 

    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (formData.photoFiles.length === 0) {
      alert("Please upload at least one photo.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Process & Upload Photos
      const uploadPromises = formData.photoFiles.map(async (file) => {
        const processedFile = await processImage(file);
        return uploadProfileImage(user.uid, processedFile);
      });
      
      const photoURLs = await Promise.all(uploadPromises);

      // 2. Create Profile in Firestore
      await createUserProfile(user.uid, {
        displayName: formData.displayName,
        age: parseInt(formData.age),
        gender: formData.gender as any,
        orientation: formData.orientation as any,
        location: {
            city: formData.city,
            country: "Unknown" // Placeholder
        },
        bio: formData.bio,
        interests: formData.interests,
        dealBreakers: formData.dealBreakers,
        photoURLs: photoURLs
      });

      // 3. Refresh Context to know about the new profile
      await refreshProfile();

      // 4. Redirect to Feed (Home)
      router.push('/'); 
    } catch (error) {
      console.error("Submission failed", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepBasicInfo formData={formData} updateFormData={updateFormData} />;
      case 2: return <StepInterests formData={formData} updateFormData={updateFormData} />;
      case 3: return <StepBio formData={formData} updateFormData={updateFormData} />;
      case 4: return <StepPhotos formData={formData} updateFormData={updateFormData} />;
      default: return null;
    }
  };

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="max-w-lg mx-auto p-8 bg-white neo-border rounded-xl my-10 min-h-[600px] flex flex-col shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
      {/* Progress Bar */}
      <div className="w-full bg-white neo-border h-4 rounded-full mb-8 overflow-hidden relative">
        <div 
          className="bg-secondary h-full transition-all duration-300 border-r-2 border-black" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Step Content */}
      <div className="flex-grow">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between items-center">
        {currentStep > 1 ? (
          <button 
            onClick={prevStep}
            className="px-6 py-3 rounded-lg bg-white neo-border font-bold hover:bg-gray-50 transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
            disabled={isSubmitting}
          >
            Back
          </button>
        ) : (
          <div></div> // Spacer
        )}

        {currentStep < totalSteps ? (
          <button 
            onClick={nextStep}
            className="px-6 py-3 rounded-lg bg-primary text-white neo-border font-bold hover:brightness-110 transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-accent text-foreground neo-border font-bold hover:brightness-110 transition-all active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] flex items-center"
          >
            {isSubmitting ? "Saving..." : "Finish Profile"}
          </button>
        )}
      </div>
    </div>
  );
};
