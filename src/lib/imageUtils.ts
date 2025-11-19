/**
 * Process an image file:
 * 1. Load it into an HTMLImageElement
 * 2. Draw it onto a canvas (resizing to max dimensions)
 * 3. Export as a blob (JPEG)
 */
export const processImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const MAX_WIDTH = 1080;
      const MAX_HEIGHT = 1080;
      const QUALITY = 0.8;
  
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          let width = img.width;
          let height = img.height;
  
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
  
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
  
          ctx.drawImage(img, 0, 0, width, height);
  
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Image processing failed'));
                return;
              }
              // Return a new File object
              const processedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(processedFile);
            },
            'image/jpeg',
            QUALITY
          );
        };
        
        img.onerror = (error) => reject(error);
      };
  
      reader.onerror = (error) => reject(error);
    });
  };
