"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Minus, ShoppingCart, Loader2 } from "lucide-react";
import type { Product, BankingDetails } from "@/lib/types";
import { 
  DEFAULT_PRODUCTS, 
  PRODUCTS_STORAGE_KEY, 
  MESSAGE_STORAGE_KEY, 
  DEFAULT_MESSAGE,
  BANKING_DETAILS_STORAGE_KEY,
  DEFAULT_BANKING_DETAILS
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";

export default function Home() {
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [paymentMessage, setPaymentMessage] = useState<string>(DEFAULT_MESSAGE);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  useEffect(() => {
    if (isMounted) {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
      const storedMessage = localStorage.getItem(MESSAGE_STORAGE_KEY);
      if (storedMessage) {
        setPaymentMessage(JSON.parse(storedMessage));
      }
      const storedBankingDetails = localStorage.getItem(BANKING_DETAILS_STORAGE_KEY);
      if (storedBankingDetails) {
        setBankingDetails(JSON.parse(storedBankingDetails));
      }
    }
  }, [isMounted]);

  const handleQuantityChange = (productId: string, amount: number) => {
    setCart((prevCart) => {
      const newQuantity = (prevCart[productId] || 0) + amount;
      if (newQuantity <= 0) {
        const { [productId]: _, ...rest } = prevCart;
        return rest;
      }
      return { ...prevCart, [productId]: newQuantity };
    });
  };

  const total = useMemo(() => {
    return Object.entries(cart).reduce((acc, [productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return acc + (product ? product.price * quantity : 0);
    }, 0);
  }, [cart, products]);

  const qrCodeData = useMemo(() => {
    const totalInWholeNumber = Math.round(total);
    const parts = [
      "SPD*1.0",
      `ACC:${bankingDetails.accountNumber}`,
      `RN:${bankingDetails.recipientName}`,
      `AM:${totalInWholeNumber}`,
      "CC:CZK",
      `MSG:${paymentMessage}`
    ];
    const data = parts.join("*");
    return encodeURIComponent(data);
  }, [total, paymentMessage, bankingDetails]);
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${qrCodeData}`;

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 md:p-8 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer group"
              onClick={() => handleQuantityChange(product.id, 1)}
            >
              <div className="relative w-full aspect-square">
                <Image 
                  src={product.imageUrl || "https://placehold.co/400x400.png"} 
                  alt={product.name} 
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  data-ai-hint="product image"
                />
                 {cart[product.id] > 0 && (
                  <div className="absolute top-2 right-2 flex items-center bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-md">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuantityChange(product.id, -1);
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-md font-bold w-6 text-center">{cart[product.id]}</span>
                  </div>
                )}
              </div>
              <CardFooter className="bg-background/80 p-3 flex-col items-start">
                 <p className="font-semibold text-md truncate w-full">{product.name}</p>
                 <p className="text-lg font-bold text-primary">{product.price.toFixed(2)} Kč</p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4">
          <div className="container mx-auto max-w-7xl flex items-center justify-between">
            <div className="text-lg font-bold">
              Celkem: <span className="text-primary text-2xl">{total.toFixed(2)} Kč</span>
            </div>
            <Button size="lg" onClick={() => setIsQrDialogOpen(true)}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Generovat QR
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skenujte pro platbu</DialogTitle>
            <DialogDescription>
              Předložte tento QR kód pro dokončení transakce.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <div className="p-4 bg-white rounded-lg shadow-md">
              <Image src={qrCodeUrl} alt="QR Code" width={256} height={256} />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Celková částka</p>
              <p className="text-4xl font-bold text-primary">{total.toFixed(2)} Kč</p>
              <p className="text-sm text-muted-foreground mt-2">{paymentMessage}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsQrDialogOpen(false)}>
              Zavřít
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
