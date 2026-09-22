import { type Product, type BankingDetails } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const CATEGORIES_STORAGE_KEY = "qr-pay-categories";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";
export const BANKING_DETAILS_STORAGE_KEY = "qr-pay-banking-details";
export const TRANSACTIONS_STORAGE_KEY = "qr-pay-transactions";
export const SETTINGS_ACCORDION_STATE_KEY = "qr-pay-settings-accordion-state";
export const POS_NAME_STORAGE_KEY = "qr-pay-pos-name";
export const DEVICE_DISABLED_PRODUCTS_KEY = "qr-pay-device-disabled-products";

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

export const DEFAULT_POS_NAME = "Hlavní pokladna";

export const ALL_CASH_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
export const DEFAULT_CASH_DENOMINATIONS = [50, 100, 200, 500, 1000, 2000];
export const CASH_DENOMINATIONS_STORAGE_KEY = "qr-pay-cash-denominations";
export const VS_COUNTER_STORAGE_KEY = "qr-pay-vs-counter";
export const LOW_STOCK_THRESHOLD = 5;
