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

/**
 * Prepares product image for cross-device sync.
 * By default, compresses to a compact Data URL (~20KB) stored directly in Firestore,
 * making it 100% free with no credit card / Blaze plan needed.
 */
export async function uploadProductImage(
  userId: string,
  productId: string,
  file: File
): Promise<string> {
  const dataUrl = await compressImageToDataUrl(file);

  // If user explicitly configured Firebase Storage (Blaze plan), try it optionally
  if (storage && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && navigator.onLine) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `products/${productId}_${Date.now()}.webp`;
      const storageRef = ref(storage, `users/${userId}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: "image/webp",
      });
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.info("Firebase Storage není aktivní (vyžaduje Blaze), používám kompaktní cloudové uložení:", err);
    }
  }

  // 100% free mode: compressed Data URL stored directly in Firestore product doc
  return dataUrl;
}
