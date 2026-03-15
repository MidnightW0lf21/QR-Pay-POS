import { type Product, type BankingDetails } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const CATEGORIES_STORAGE_KEY = "qr-pay-categories";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";
export const BANKING_DETAILS_STORAGE_KEY = "qr-pay-banking-details";
export const TRANSACTIONS_STORAGE_KEY = "qr-pay-transactions";
export const SETTINGS_ACCORDION_STATE_KEY = "qr-pay-settings-accordion-state";

export const DEFAULT_CATEGORIES: string[] = ["Nápoje", "Jídlo", "Merch"];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Káva", price: 85, costPrice: 25, category: "Nápoje", icon: "Coffee", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 20 },
  { id: "2", name: "Sendvič", price: 120, costPrice: 45, category: "Jídlo", icon: "Sandwich", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 15 },
  { id: "3", name: "Muffin", price: 65, costPrice: 20, category: "Jídlo", icon: "CakeSlice", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 30 },
  { id: "4", name: "Džus", price: 70, costPrice: 30, category: "Nápoje", icon: "GlassWater", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 25 },
];

export const DEFAULT_MESSAGE = "Děkujeme za Váš nákup!";

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  accountNumber: "",
  recipientName: "",
};
