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
