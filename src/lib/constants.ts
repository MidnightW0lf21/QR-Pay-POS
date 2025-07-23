import { type Product, type BankingDetails } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";
export const BANKING_DETAILS_STORAGE_KEY = "qr-pay-banking-details";
export const TRANSACTIONS_STORAGE_KEY = "qr-pay-transactions";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Káva", price: 85, icon: "Coffee", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "2", name: "Sendvič", price: 120, icon: "Sandwich", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "3", name: "Muffin", price: 65, icon: "CakeSlice", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "4", name: "Džus", price: 70, icon: "GlassWater", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "5", name: "Salát", price: 150, icon: "Vegan", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "6", name: "Kousek pizzy", price: 75, icon: "Pizza", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "7", name: "Croissant", price: 55, icon: "Croissant", imageUrl: "https://placehold.co/400x400.png", enabled: true },
  { id: "8", name: "Čaj", price: 60, icon: "CupSoda", imageUrl: "https://placehold.co/400x400.png", enabled: true },
];

export const DEFAULT_MESSAGE = "Děkujeme za Váš nákup!";

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  accountNumber: "",
  recipientName: "",
};
