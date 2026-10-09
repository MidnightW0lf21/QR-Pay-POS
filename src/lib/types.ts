import { type icons } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  category?: string;
  categories?: string[];
  icon?: keyof typeof icons;
  imageUrl?: string;
  enabled?: boolean;
  stock: number;
}

export function getProductCategories(product?: Partial<Product> | null): string[] {
  if (!product) return [];
  if (Array.isArray(product.categories) && product.categories.length > 0) {
    return product.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
  }
  if (product.category && typeof product.category === 'string' && product.category.trim() && product.category !== 'none') {
    return [product.category.trim()];
  }
  return [];
}

export interface BankingDetails {
  accountNumber: string;
  recipientName: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  originalPrice?: number;
  isCustom?: boolean;
}

export type PaymentMethod = 'qr' | 'cash';

export interface Transaction {
  id: string;
  date: string;
  total: number;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  posName?: string;
  variableSymbol?: string;
}

