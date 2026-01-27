/**
 * Compresses an image file before upload
 * @param file - The original image file
 * @param maxWidth - Maximum width (default 1920px)
 * @param maxHeight - Maximum height (default 1920px)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Compressed image as a Blob
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Skip compression for small files (under 500KB)
    if (file.size < 500 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Only use compressed version if it's actually smaller
            if (blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compresses multiple images in parallel
 */
export async function compressImages(
  files: File[],
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8
): Promise<{ original: File; compressed: Blob }[]> {
  const results = await Promise.all(
    files.map(async (file) => ({
      original: file,
      compressed: await compressImage(file, maxWidth, maxHeight, quality),
    }))
  );
  return results;
}
