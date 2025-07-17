import { type Product, type BankingDetails } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";
export const BANKING_DETAILS_STORAGE_KEY = "qr-pay-banking-details";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Káva", price: 85.00, icon: "Coffee", imageUrl: "https://placehold.co/400x400.png" },
  { id: "2", name: "Sendvič", price: 120.00, icon: "Sandwich", imageUrl: "https://placehold.co/400x400.png" },
  { id: "3", name: "Muffin", price: 65.00, icon: "CakeSlice", imageUrl: "https://placehold.co/400x400.png" },
  { id: "4", name: "Džus", price: 70.00, icon: "GlassWater", imageUrl: "https://placehold.co/400x400.png" },
  { id: "5", name: "Salát", price: 150.00, icon: "Vegan", imageUrl: "https://placehold.co/400x400.png" },
  { id: "6", name: "Kousek pizzy", price: 75.00, icon: "Pizza", imageUrl: "https://placehold.co/400x400.png" },
  { id: "7", name: "Croissant", price: 55.00, icon: "Croissant", imageUrl: "https://placehold.co/400x400.png" },
  { id: "8", name: "Čaj", price: 60.00, icon: "CupSoda", imageUrl: "https://placehold.co/400x400.png" },
];

export const DEFAULT_MESSAGE = "Děkujeme za Váš nákup!";

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  accountNumber: "",
  recipientName: "",
};
