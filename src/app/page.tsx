"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { DEFAULT_PRODUCTS, PRODUCTS_STORAGE_KEY, MESSAGE_STORAGE_KEY, DEFAULT_MESSAGE } from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import IconDisplay from "@/components/icon-display";

export default function Home() {
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [paymentMessage, setPaymentMessage] = useState<string>(DEFAULT_MESSAGE);
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
    const cartItems = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return { name: product?.name || 'Unknown', quantity };
    });

    const data = {
      total: total.toFixed(2),
      message: paymentMessage,
      items: cartItems,
    };
    return encodeURIComponent(JSON.stringify(data));
  }, [total, paymentMessage, cart, products]);
  
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                <div className="bg-accent rounded-full p-3">
                  <IconDisplay name={product.icon} className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0">
                <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
              </CardContent>
              <CardFooter className="bg-muted/50 p-4">
                <div className="flex items-center justify-between w-full">
                  <Button variant="outline" size="icon" onClick={() => handleQuantityChange(product.id, -1)} disabled={!cart[product.id]}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">{cart[product.id] || 0}</span>
                  <Button variant="outline" size="icon" onClick={() => handleQuantityChange(product.id, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4">
          <div className="container mx-auto max-w-7xl flex items-center justify-between">
            <div className="text-lg font-bold">
              Total: <span className="text-primary text-2xl">${total.toFixed(2)}</span>
            </div>
            <Button size="lg" onClick={() => setIsQrDialogOpen(true)}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Generate QR
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan to Pay</DialogTitle>
            <DialogDescription>
              Present this QR code to complete the transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <div className="p-4 bg-white rounded-lg shadow-md">
              <Image src={qrCodeUrl} alt="QR Code" width={256} height={256} />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Total Amount</p>
              <p className="text-4xl font-bold text-primary">${total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-2">{paymentMessage}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsQrDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
