import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique UUID v4.
 * Works across secure contexts, non-secure contexts (e.g. mobile HTTP over local Wi-Fi),
 * and older browsers.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails for any reason
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a 10-digit Variable Symbol for Czech SPAYD QR codes in format YYMMDDxxxx.
 * Sequences from 0001 to 9999 per day and cycles back after 9999.
 */
export function generateVariableSymbol(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yy}${mm}${dd}`;

  const storageKey = "qr-pay-vs-counter";
  let counter = 1;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === datePrefix) {
          counter = (parsed.counter >= 9999) ? 1 : (parsed.counter + 1);
        }
      }
      localStorage.setItem(storageKey, JSON.stringify({ date: datePrefix, counter }));
    } catch {
      counter = Math.floor(Math.random() * 9000) + 1000;
    }
  } else {
    counter = Math.floor(Math.random() * 9000) + 1000;
  }

  return `${datePrefix}${String(counter).padStart(4, '0')}`;
}
