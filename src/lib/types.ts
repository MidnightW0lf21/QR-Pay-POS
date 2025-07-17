import { type icons } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  price: number;
  icon?: keyof typeof icons;
  imageUrl?: string;
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
}

export type PaymentMethod = 'qr' | 'cash';

export interface Transaction {
  id: string;
  date: string;
  total: number;
  items: CartItem[];
  paymentMethod: PaymentMethod;
}
