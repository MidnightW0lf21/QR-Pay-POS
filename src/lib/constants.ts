import { type Product } from "./types";

export const PRODUCTS_STORAGE_KEY = "qr-pay-products";
export const MESSAGE_STORAGE_KEY = "qr-pay-message";

export const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Coffee", price: 3.50, icon: "Coffee" },
  { id: "2", name: "Sandwich", price: 6.00, icon: "Sandwich" },
  { id: "3", name: "Muffin", price: 2.75, icon: "CakeSlice" },
  { id: "4", name: "Juice", price: 4.00, icon: "GlassWater" },
  { id: "5", name: "Salad", price: 7.50, icon: "Vegan" },
  { id: "6", name: "Pizza Slice", price: 4.25, icon: "Pizza" },
  { id: "7", name: "Croissant", price: 2.50, icon: "Croissant" },
  { id: "8", name: "Tea", price: 3.00, icon: "CupSoda" },
];

export const DEFAULT_MESSAGE = "Thank you for your business!";
