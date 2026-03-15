import { type Product, type BankingDetails } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";
export const BANKING_DETAILS_STORAGE_KEY = "qr-pay-banking-details";
export const TRANSACTIONS_STORAGE_KEY = "qr-pay-transactions";
export const SETTINGS_ACCORDION_STATE_KEY = "qr-pay-settings-accordion-state";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Káva", price: 85, category: "Nápoje", icon: "Coffee", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 20 },
  { id: "2", name: "Sendvič", price: 120, category: "Jídlo", icon: "Sandwich", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 15 },
  { id: "3", name: "Muffin", price: 65, category: "Jídlo", icon: "CakeSlice", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 30 },
  { id: "4", name: "Džus", price: 70, category: "Nápoje", icon: "GlassWater", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 25 },
  { id: "5", name: "Salát", price: 150, category: "Jídlo", icon: "Vegan", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 10 },
  { id: "6", name: "Kousek pizzy", price: 75, category: "Jídlo", icon: "Pizza", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 12 },
  { id: "7", name: "Croissant", price: 55, category: "Jídlo", icon: "Croissant", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 18 },
  { id: "8", name: "Čaj", price: 60, category: "Nápoje", icon: "CupSoda", imageUrl: "https://placehold.co/400x400.png", enabled: true, stock: 40 },
];

export const DEFAULT_MESSAGE = "Děkujeme za Váš nákup!";

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  accountNumber: "",
  recipientName: "",
};
