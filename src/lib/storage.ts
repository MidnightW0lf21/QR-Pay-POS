import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Resizes and compresses an image in browser using canvas to a lightweight WebP/JPEG Data URL.
 * Produces very small images (~15-30KB) that fit directly in Firestore documents (limit is 1MB),
 * allowing 100% FREE cloud sync across all devices without needing a paid Firebase Blaze plan or credit card.
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
            height = maxHeight;
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

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Prepares product image for cross-device sync.
 * Attempts to upload to Firebase Storage with a strict 5-second timeout.
 * If Storage is blocked, slow, or unavailable, instantly falls back to a compact WebP Data URL (~20KB)
 * stored directly in Firestore, guaranteeing 100% reliable real-time sync across devices without freezing.
 */
export async function uploadProductImage(
  userId: string,
  productId: string,
  file: File
): Promise<string> {
  const dataUrl = await compressImageToDataUrl(file);

  // If user explicitly configured Firebase Storage (Blaze plan), try it with strict 5s timeout
  if (storage && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && navigator.onLine) {
    try {
      const uploadPromise = (async () => {
        const blob = dataUrlToBlob(dataUrl);
        const fileName = `products/${productId}_${Date.now()}.webp`;
        const storageRef = ref(storage, `users/${userId}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, blob, {
          contentType: "image/webp",
        });
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firebase Storage timeout (5s)")), 5000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.info("Firebase Storage nebyl dokončen včas nebo není dostupný, používám kompaktní synchronizaci:", err);
    }
  }

  // 100% free mode: compressed Data URL stored directly in Firestore product doc
  return dataUrl;
}
