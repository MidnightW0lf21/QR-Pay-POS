"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Card,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Minus, ShoppingCart, Loader2, Landmark, Wallet, Tag, AlertTriangle, Eye, EyeOff } from "lucide-react";
import type { Product, BankingDetails, Transaction, CartItem } from "@/lib/types";
import { 
  DEFAULT_PRODUCTS, 
  PRODUCTS_STORAGE_KEY, 
  CATEGORIES_STORAGE_KEY,
  DEFAULT_CATEGORIES,
  MESSAGE_STORAGE_KEY, 
  DEFAULT_MESSAGE,
  BANKING_DETAILS_STORAGE_KEY,
  DEFAULT_BANKING_DETAILS,
  TRANSACTIONS_STORAGE_KEY,
  POS_NAME_STORAGE_KEY,
  DEFAULT_POS_NAME,
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { getImage } from "@/lib/db";

const ProductImage = ({ product, fill }: { product: Product; fill?: boolean }) => {
  const [imageUrl, setImageUrl] = useState("https://placehold.co/400x400.png");

  useEffect(() => {
    const loadImage = async () => {
      if (product.imageUrl?.startsWith('img_')) {
        const storedImage = await getImage(product.imageUrl);
        setImageUrl(storedImage || "https://placehold.co/400x400.png");
      } else if (product.imageUrl) {
        setImageUrl(product.imageUrl);
      } else {
        setImageUrl("https://placehold.co/400x400.png");
      }
    };
    loadImage();
  }, [product.imageUrl]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", fill ? "h-full w-full" : "h-40 w-40 rounded-md")}>
      <Image 
        src={imageUrl} 
        alt={product.name} 
        fill={fill}
        width={fill ? undefined : 400}
        height={fill ? undefined : 400}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        data-ai-hint="product image"
      />
    </div>
  );
};

export default function Home() {
  const isMounted = useIsMounted();
  const { toast } = useToast();
  const { paymentMode, setPaymentMode, columnView } = useAppContext();
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [paymentMessage, setPaymentMessage] = useState<string>(DEFAULT_MESSAGE);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  const isCashMode = paymentMode === 'cash';

  useEffect(() => {
    if (isMounted) {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
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

  const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const handleQuantityChange = (productId: string, amount: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const currentQuantity = cart[productId] || 0;

    if (amount > 0) {
      if (currentQuantity >= product.stock) {
        toast({
          variant: "destructive",
          title: "Nedostatek zboží",
          description: `Na skladě je pouze ${product.stock} kusů produktu ${product.name}.`,
          duration: 2000,
        });
        return;
      }
      triggerHapticFeedback();
    }
    
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

  const change = useMemo(() => {
    if (cashReceived === null) return null;
    return cashReceived - total;
  }, [cashReceived, total]);

  const handleOpenDialog = () => {
    if (isCashMode) {
      setIsCashDialogOpen(true);
    } else {
      setIsQrDialogOpen(true);
    }
  };
  
  const handleCloseDialog = () => {
    saveTransaction();
    setIsQrDialogOpen(false);
    setIsCashDialogOpen(false);
    setCashReceived(null);
    setCart({}); 
  };

  const saveTransaction = () => {
    if (Object.keys(cart).length === 0) return;

    const transactionItems: CartItem[] = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId)!;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
      };
    });

    const newProducts = products.map(product => {
      if (cart[product.id]) {
        return { ...product, stock: product.stock - cart[product.id] };
      }
      return product;
    });
    setProducts(newProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));

    const storedPosName = localStorage.getItem(POS_NAME_STORAGE_KEY);
    const posName = storedPosName ? JSON.parse(storedPosName) : DEFAULT_POS_NAME;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      total: total,
      items: transactionItems,
      paymentMethod: isCashMode ? 'cash' : 'qr',
      posName: posName,
    };

    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    transactions.unshift(newTransaction);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    toast({ 
      title: "Úspěch", 
      description: "Transakce uložena do historie.",
      variant: "success",
      duration: 1000,
    });
  };

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
    return parts.join("*");
  }, [total, paymentMessage, bankingDetails]);
  
  useEffect(() => {
    if (isQrDialogOpen && qrCodeData) {
      QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 256,
      })
      .then(url => {
        setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.error("Failed to generate QR code", err);
        setQrCodeDataUrl('');
      });
    }
  }, [isQrDialogOpen, qrCodeData]);

  const visibleProducts = useMemo(() => {
    return products.filter(p => {
      if (p.enabled === false) return false;
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (!showOutOfStock && p.stock <= 0) return false;
      return true;
    });
  }, [products, selectedCategory, showOutOfStock]);

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 md:p-8 pb-32">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className={cn(isCashMode ? "text-primary" : "text-muted-foreground")} />
              <Switch
                id="payment-mode"
                checked={!isCashMode}
                onCheckedChange={(checked) => setPaymentMode(checked ? 'qr' : 'cash')}
                aria-label="Přepnout režim platby"
              />
              <Landmark className={cn(!isCashMode ? "text-primary" : "text-muted-foreground")} />
              <Label htmlFor="payment-mode" className="text-lg">
                {isCashMode ? "Hotovost" : "QR platba"}
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowOutOfStock(!showOutOfStock)}
                className={cn(showOutOfStock ? "text-primary bg-primary/10" : "text-muted-foreground")}
                title={showOutOfStock ? "Skrýt vyprodané" : "Zobrazit vyprodané"}
              >
                {showOutOfStock ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <ScrollArea className="w-full">
            <div className="flex space-x-2 pb-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="whitespace-nowrap rounded-full"
              >
                Vše
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap rounded-full"
                >
                  <Tag className="mr-1.5 h-3.5 w-3.5" />
                  {cat}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        <div className={cn(
          "grid gap-4",
          columnView === '2-col' ? "grid-cols-2" : "grid-cols-3",
          "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        )}>
          {visibleProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= 3;
            const inCart = cart[product.id] || 0;
            const remainingStock = product.stock - inCart;

            return (
              <Card 
                key={product.id} 
                className={cn(
                  "flex flex-col overflow-hidden transition-all duration-300 group relative border-none shadow-md",
                  inCart > 0 && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-[.98]",
                  isOutOfStock && inCart === 0 ? "opacity-60 grayscale cursor-not-allowed" : "cursor-pointer hover:shadow-xl",
                  isLowStock && !inCart && "ring-1 ring-orange-500/50"
                )}
                onClick={() => !isOutOfStock && handleQuantityChange(product.id, 1)}
              >
                <div className="relative w-full aspect-square">
                  <ProductImage product={product} fill />
                  
                  {/* Bottom Gradient Overlay - darker for better text visibility */}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-10" />

                  {/* Product Info inside the card */}
                  <div className="absolute bottom-3 left-3 right-3 text-white z-20 flex flex-col items-start">
                    <p className="font-bold text-base leading-tight truncate w-full drop-shadow-md">
                      {product.name}
                    </p>
                    <p className="text-2xl font-black text-primary drop-shadow-xl brightness-110">
                      {product.price.toFixed(0)} Kč
                    </p>
                  </div>

                  {/* Quantity controls */}
                  {inCart > 0 && (
                    <div className="absolute top-2 right-2 flex items-center bg-background/90 backdrop-blur-sm rounded-full p-0.5 shadow-lg z-30">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(product.id, -1);
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-lg font-bold w-7 text-center">{inCart}</span>
                    </div>
                  )}

                  {/* Stock Badges */}
                  {isLowStock && !inCart && (
                    <Badge variant="outline" className="absolute top-2 left-2 bg-orange-500 text-white border-none animate-pulse z-30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="mr-1 h-3 w-3" /> Dochází
                    </Badge>
                  )}

                  <Badge 
                    variant={remainingStock <= 0 ? "destructive" : "secondary"} 
                    className={cn(
                      "absolute top-2 left-2 flex items-center text-[11px] px-2 py-0.5 z-30 font-bold",
                      remainingStock <= 0 ? "bg-destructive text-white" : "bg-black/60 text-white border-none backdrop-blur-sm",
                      isLowStock && !inCart && "hidden"
                    )}
                  >
                    {remainingStock <= 0 ? "VYPRODÁNO" : `${product.stock} ks`}
                  </Badge>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-4 z-40">
          <div className="container mx-auto max-w-7xl flex items-center justify-between">
            <div className="text-lg font-bold">
              Celkem: <span className="text-primary text-2xl">{total.toFixed(0)} Kč</span>
            </div>
            <Button size="lg" onClick={handleOpenDialog}>
              {isCashMode ? <Wallet className="mr-2 h-5 w-5" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
              {isCashMode ? 'Zaplatit hotově' : 'Generovat QR'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isQrDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skenujte pro platbu</DialogTitle>
            <DialogDescription>
              Předložte tento QR kód pro dokončení transakce.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 p-4">
            <div className="p-4 bg-white rounded-lg shadow-md">
              {qrCodeDataUrl ? (
                <Image src={qrCodeDataUrl} alt="QR Code" width={256} height={256} />
              ) : (
                <div className="w-[256px] h-[256px] flex items-center justify-center bg-gray-100">
                   <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="text-center w-full">
              <p className="text-lg font-medium text-muted-foreground">Celková částka</p>
              <p className="text-4xl font-bold text-primary">{total.toFixed(0)} Kč</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog} className="w-full h-12">
              Zavřít a vymazat košík
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCashDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Platba v hotovosti</DialogTitle>
            <DialogDescription>
              Zadejte přijatou částku pro výpočet vrácených peněz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Celková částka</p>
              <p className="text-4xl font-bold text-primary">{total.toFixed(0)} Kč</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cash-received">Přijatá hotovost (Kč)</Label>
                <Input
                  id="cash-received"
                  type="number"
                  placeholder="0"
                  value={cashReceived ?? ""}
                  onChange={(e) => setCashReceived(e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="text-center text-lg h-12"
                />
              </div>
            </div>

            {change !== null && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-lg font-medium text-muted-foreground">
                  {change >= 0 ? "Vrátit" : "Nedostatečná hotovost"}
                </p>
                <p className={`text-4xl font-bold ${change >= 0 ? "text-primary" : "text-destructive"}`}>
                  {Math.abs(change).toFixed(0)} Kč
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog} className="w-full h-12">
              Dokončit prodej
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}