import React, { useRef } from 'react';
import { OnboardingFormData } from '@/types';

interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
}

export const StepPhotos: React.FC<StepProps> = ({ formData, updateFormData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      
      // Validate max 5 photos total
      if (formData.photoFiles.length + newFiles.length > 5) {
        alert("You can only upload up to 5 photos.");
        return;
      }

      // Create local preview URLs
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));

      updateFormData({
        photoFiles: [...formData.photoFiles, ...newFiles],
        photoPreviews: [...formData.photoPreviews, ...newPreviews]
      });
    }
  };

  const removePhoto = (index: number) => {
    const newFiles = [...formData.photoFiles];
    const newPreviews = [...formData.photoPreviews];
    
    // Revoke the URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index]);

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    updateFormData({
      photoFiles: newFiles,
      photoPreviews: newPreviews
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">Photos</h2>
        <p className="text-gray-600">Add up to 5 photos. First one is your main profile pic.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {formData.photoPreviews.map((preview, index) => (
          <div key={index} className="relative aspect-square bg-white rounded-lg overflow-hidden group neo-border shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <img 
              src={preview} 
              alt={`Preview ${index + 1}`} 
              className="w-full h-full object-cover" 
            />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 bg-white border-2 border-black text-black rounded-full p-1.5 hover:bg-primary hover:text-white transition-colors shadow-sm z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {index === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-accent border-t-2 border-black text-black text-xs font-bold text-center py-1">
                MAIN
              </div>
            )}
          </div>
        ))}

        {formData.photoPreviews.length < 5 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-white rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-primary transition-colors neo-border border-dashed hover:border-solid hover:bg-yellow-50 group"
          >
            <div className="w-12 h-12 rounded-full border-2 border-gray-300 group-hover:border-primary flex items-center justify-center mb-2 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-bold group-hover:text-foreground">Add Photo</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
};
