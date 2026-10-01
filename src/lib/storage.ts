/**
 * Resizes and compresses an image in browser to a perfect 400x400 square WebP Data URL.
 * Automatically center-crops any image (landscape, portrait, or square) to 1:1 aspect ratio,
 * ensuring zero distortion/stretching and lightweight size (~15-25KB) stored directly in Firestore.
 */
export async function compressImageToDataUrl(
  file: File,
  size = 400,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          reject(new Error("Nelze načíst rozměry obrázku."));
          return;
        }

        // Center-crop to exact 1:1 square
        const minDimension = Math.min(naturalWidth, naturalHeight);
        const sx = Math.round((naturalWidth - minDimension) / 2);
        const sy = Math.round((naturalHeight - minDimension) / 2);

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Nelze získat kontext plátna pro kompresi."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw center-cropped square into 400x400 canvas
        ctx.drawImage(
          img,
          sx,
          sy,
          minDimension,
          minDimension,
          0,
          0,
          size,
          size
        );

        // Convert to WebP (fallback to JPEG)
        try {
          const webpDataUrl = canvas.toDataURL("image/webp", quality);
          if (webpDataUrl && webpDataUrl.startsWith("data:image/webp")) {
            resolve(webpDataUrl);
            return;
          }
        } catch (e) {}

        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(jpegDataUrl);
      };
      img.onerror = (error) => reject(error);
      img.src = event.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Prepares product image for direct Firestore sync.
 * Compresses the image to a compact square WebP Data URL (~15-25KB) stored directly in Firestore,
 * making it 100% free, instant, and distortion-free across all devices.
 */
export async function uploadProductImage(
  _userId: string,
  _productId: string,
  file: File
): Promise<string> {
  return await compressImageToDataUrl(file);
}
