import { type Product, type BankingDetails } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";
export const BANKING_DETAILS_STORAGE_KEY = "qr-pay-banking-details";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Coffee", price: 3.50, icon: "Coffee", imageUrl: "https://placehold.co/400x400.png" },
  { id: "2", name: "Sandwich", price: 6.00, icon: "Sandwich", imageUrl: "https://placehold.co/400x400.png" },
  { id: "3", name: "Muffin", price: 2.75, icon: "CakeSlice", imageUrl: "https://placehold.co/400x400.png" },
  { id: "4", name: "Juice", price: 4.00, icon: "GlassWater", imageUrl: "https://placehold.co/400x400.png" },
  { id: "5", name: "Salad", price: 7.50, icon: "Vegan", imageUrl: "https://placehold.co/400x400.png" },
  { id: "6", name: "Pizza Slice", price: 4.25, icon: "Pizza", imageUrl: "https://placehold.co/400x400.png" },
  { id: "7", name: "Croissant", price: 2.50, icon: "Croissant", imageUrl: "https://placehold.co/400x400.png" },
  { id: "8", name: "Tea", price: 3.00, icon: "CupSoda", imageUrl: "https://placehold.co/400x400.png" },
];

export const DEFAULT_MESSAGE = "Thank you for your business!";

export const DEFAULT_BANKING_DETAILS: BankingDetails = {
  bankName: "",
  accountNumber: "",
  routingNumber: "",
};
