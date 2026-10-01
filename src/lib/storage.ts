/**
 * Resizes and compresses an image in browser using canvas to a lightweight WebP/JPEG Data URL.
 * Produces very small images (~15-25KB) that fit directly in Firestore documents (Firestore limit is 1MB),
 * allowing 100% FREE real-time cloud sync across all devices without needing a paid Firebase Blaze plan or Firebase Storage.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            width = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Nelze získat kontext plátna pro kompresi."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP (fallback to JPEG if webp not supported)
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
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Prepares product image for direct Firestore sync.
 * Compresses the image to a compact WebP Data URL (~15-25KB) stored directly in Firestore,
 * making it 100% free, instant, and reliable across all devices without needing Firebase Storage or a Blaze plan.
 */
export async function uploadProductImage(
  _userId: string,
  _productId: string,
  file: File
): Promise<string> {
  return await compressImageToDataUrl(file);
}
