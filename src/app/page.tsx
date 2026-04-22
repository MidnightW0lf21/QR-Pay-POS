
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Minus, ShoppingCart, Loader2, Landmark, Wallet, Tag, Eye, EyeOff, Receipt, Scissors } from "lucide-react";
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
  const [currentPosName, setCurrentPosName] = useState(DEFAULT_POS_NAME);
  
  const [isClosing, setIsClosing] = useState(false);
  const [isTorn, setIsTorn] = useState(false);

  const cashInputRef = useRef<HTMLInputElement>(null);

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
      const storedPosName = localStorage.getItem(POS_NAME_STORAGE_KEY);
      if (storedPosName) {
        setCurrentPosName(JSON.parse(storedPosName));
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isCashDialogOpen) {
      const timer = setTimeout(() => {
        cashInputRef.current?.focus();
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [isCashDialogOpen]);

  const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([70]);
      } catch (e) {
        // Ignored
      }
    }
  };

  const handleQuantityChange = (productId: string, amount: number) => {
    triggerHapticFeedback();
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const currentQuantity = cart[productId] || 0;
    if (amount > 0 && currentQuantity >= product.stock) {
      toast({ variant: "destructive", title: "Nedostatek zboží", description: `Na skladě je pouze ${product.stock} kusů.` });
      return;
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
    triggerHapticFeedback();
    setIsClosing(false);
    setIsTorn(false);
    if (isCashMode) setIsCashDialogOpen(true);
    else setIsQrDialogOpen(true);
  };
  
  const handleFinalizeAndClose = async () => {
    triggerHapticFeedback();
    
    setIsClosing(true);
    
    // Časování pro trhnutí (masku)
    await new Promise(r => setTimeout(r, 400));
    
    setIsTorn(true);

    // Časování pro odlet (musí být delší než animace v CSS)
    await new Promise(r => setTimeout(r, 800));
    
    saveTransaction();
    setIsQrDialogOpen(false);
    setIsCashDialogOpen(false);
    setCashReceived(null);
    setCart({}); 
    setIsClosing(false);
    setIsTorn(false);
  };

  const saveTransaction = () => {
    if (Object.keys(cart).length === 0) return;
    const transactionItems: CartItem[] = Object.entries(cart).map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId)!;
      return { productId: product.id, name: product.name, price: product.price, quantity: quantity };
    });
    const newProducts = products.map(product => {
      if (cart[product.id]) return { ...product, stock: product.stock - cart[product.id] };
      return product;
    });
    setProducts(newProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));
    const newTransaction: Transaction = { id: crypto.randomUUID(), date: new Date().toISOString(), total: total, items: transactionItems, paymentMethod: isCashMode ? 'cash' : 'qr', posName: currentPosName };
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    transactions.unshift(newTransaction);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    toast({ title: "Úspěch", description: "Transakce uložena.", variant: "success" });
  };

  const qrCodeData = useMemo(() => {
    const totalInWholeNumber = Math.round(total);
    const parts = ["SPD*1.0", `ACC:${bankingDetails.accountNumber}`, `RN:${bankingDetails.recipientName}`, `AM:${totalInWholeNumber}`, "CC:CZK", `MSG:${paymentMessage}`];
    return parts.join("*");
  }, [total, paymentMessage, bankingDetails]);
  
  useEffect(() => {
    if (isQrDialogOpen && qrCodeData) {
      QRCode.toDataURL(qrCodeData, { errorCorrectionLevel: 'H', margin: 2, width: 256 })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error(err));
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

  if (!isMounted) return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;

  return (
    <>
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 md:p-8 pb-32">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className={cn(isCashMode ? "text-primary" : "text-muted-foreground")} />
              <Switch id="payment-mode" checked={!isCashMode} onCheckedChange={(checked) => { triggerHapticFeedback(); setPaymentMode(checked ? 'qr' : 'cash'); }} aria-label="Přepnout režim platby" />
              <Landmark className={cn(!isCashMode ? "text-primary" : "text-muted-foreground")} />
              <Label htmlFor="payment-mode" className="text-lg">{isCashMode ? "Hotovost" : "QR platba"}</Label>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { triggerHapticFeedback(); setShowOutOfStock(!showOutOfStock); }} className={cn(showOutOfStock ? "text-primary bg-primary/10" : "text-muted-foreground")}>{showOutOfStock ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</Button>
          </div>
          <ScrollArea className="w-full">
            <div className="flex space-x-2 pb-2">
              <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => { triggerHapticFeedback(); setSelectedCategory("all"); }} className="whitespace-nowrap rounded-full">Vše</Button>
              {categories.map((cat) => (
                <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => { triggerHapticFeedback(); setSelectedCategory(cat); }} className="whitespace-nowrap rounded-full"><Tag className="mr-1.5 h-3.5 w-3.5" />{cat}</Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        <div className={cn("grid gap-4", columnView === '2-col' ? "grid-cols-2" : "grid-cols-3", "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
          {visibleProducts.map((product) => {
            const inCart = cart[product.id] || 0;
            const remainingStock = product.stock - inCart;
            const isLowStock = remainingStock > 0 && remainingStock <= 5;
            
            return (
              <Card key={product.id} className={cn("flex flex-col overflow-hidden transition-all duration-200 group relative border-none shadow-md active:scale-95", inCart > 0 && "ring-4 ring-primary ring-offset-2 ring-offset-background scale-[.98]", product.stock <= 0 && inCart === 0 ? "opacity-60 grayscale cursor-not-allowed" : "cursor-pointer hover:shadow-xl")} onClick={() => product.stock > 0 && handleQuantityChange(product.id, 1)}>
                <div className="relative w-full aspect-square">
                  <ProductImage product={product} fill />
                  {/* Barevně adaptivní fade – ve světlém režimu z bílé, v tmavém z černé */}
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-card/95 via-card/50 to-transparent z-10" />
                  
                  {/* Barva textu názvu produktu se nyní mění podle režimu */}
                  <div className="absolute bottom-3 left-3 right-3 text-card-foreground z-20 flex flex-col items-start">
                    <p className="font-bold text-base leading-tight truncate w-full">{product.name}</p>
                    <p className="text-2xl font-black text-primary brightness-110">{product.price.toFixed(0)} Kč</p>
                  </div>
                  
                  {inCart > 0 && (
                    <div className="absolute top-2 right-2 flex items-center bg-background/90 backdrop-blur-sm rounded-full p-0.5 shadow-lg z-30">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={(e) => { e.stopPropagation(); handleQuantityChange(product.id, -1); }}><Minus className="h-4 w-4" /></Button>
                      <span className="text-lg font-bold w-7 text-center">{inCart}</span>
                    </div>
                  )}
                  
                  {/* Štítek skladu - Dynamický podle stavu */}
                  <Badge 
                    variant={remainingStock <= 5 ? "destructive" : "secondary"} 
                    className={cn(
                      "absolute top-2 left-2 flex items-center text-[11px] px-2 py-0.5 z-30 font-bold", 
                      remainingStock <= 5 ? "bg-destructive text-white" : "bg-background/60 text-foreground border-none backdrop-blur-sm shadow-sm"
                    )}
                  >
                    {remainingStock <= 0 ? "VYPRODÁNO" : isLowStock ? `DOCHÁZÍ (${remainingStock} ks)` : `${remainingStock} ks`}
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
            <div className="text-lg font-bold">Celkem: <span className="text-primary text-2xl">{total.toFixed(0)} Kč</span></div>
            <Button size="lg" onClick={handleOpenDialog} className="active:scale-95 transition-transform">
              {isCashMode ? <Wallet className="mr-2 h-5 w-5" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
              {isCashMode ? 'Zaplatit hotově' : 'Generovat QR'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isQrDialogOpen || isCashDialogOpen} onOpenChange={(open) => !open && !isClosing && handleFinalizeAndClose()}>
        <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-[360px] focus-visible:outline-none overflow-visible [&>button]:hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className={cn(
            "relative",
            !isClosing && "animate-receipt-print"
          )}>
            {/* ÚČTENKA */}
            <div className={cn(
              "receipt-paper bg-white p-8 pb-12 w-full relative z-20",
              isTorn && "animate-fly-up"
            )}>
              <div className="w-full text-center border-b border-dashed border-zinc-300 pb-4 mb-4">
                 <div className="flex items-center justify-center gap-2 mb-1 text-zinc-800">
                   <Receipt className="h-5 w-5" />
                   <DialogTitle className="text-xs font-bold uppercase tracking-[0.2em]">
                     {isCashDialogOpen ? "Účtenka / Hotovost" : "Účtenka / QR Platba"}
                   </DialogTitle>
                 </div>
                 <DialogDescription className="text-[10px] text-zinc-800 font-bold uppercase">
                   {currentPosName} • {new Date().toLocaleString('cs-CZ')}
                 </DialogDescription>
              </div>

              <div className="text-center w-full mb-6">
                <p className="text-sm font-bold text-zinc-800 mb-1">K úhradě</p>
                <p className="text-5xl font-black text-primary tabular-nums tracking-tight">
                  {total.toFixed(0)} <span className="text-2xl ml-1">Kč</span>
                </p>
              </div>

              {isQrDialogOpen && (
                <div className="p-4 bg-white rounded-lg shadow-inner mb-6 ring-1 ring-black/5">
                  {qrCodeDataUrl ? <Image src={qrCodeDataUrl} alt="QR Code" width={220} height={220} className="mx-auto" /> : <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-50"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
                </div>
              )}

              {isCashDialogOpen && (
                <div className="space-y-4 mb-6 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="cash-received" className="text-xs font-bold uppercase text-zinc-800 tracking-wider">Přijato</Label>
                    <div className="relative">
                       <input ref={cashInputRef} id="cash-received" type="number" placeholder="0" value={cashReceived ?? ""} onChange={(e) => setCashReceived(e.target.value === '' ? null : parseFloat(e.target.value))} className="w-full text-center text-2xl h-14 font-bold bg-muted/20 border-dashed border-2 text-zinc-800 focus:outline-none rounded-md" />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">Kč</div>
                    </div>
                  </div>
                  <div className={cn("smooth-expand-container", change !== null ? "is-open" : "")}>
                    <div className="min-h-0 pt-4">
                      <div className="p-4 bg-zinc-50 rounded-lg border border-dashed border-zinc-200 text-center">
                        <p className="text-xs font-bold uppercase text-zinc-800 mb-1">{change !== null && change >= 0 ? "Vrátit" : "Doplatit"}</p>
                        <p className={cn("text-4xl font-black tabular-nums", change !== null && change >= 0 ? "text-primary" : "text-destructive")}>{change !== null ? Math.abs(change).toFixed(0) : "0"} <span className="text-xl">Kč</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full text-center border-t border-dashed border-zinc-300 pt-4 mt-2">
                 <p className="text-[11px] text-zinc-800 font-bold italic mb-6">{isQrDialogOpen ? "Skenujte kód v bankovní aplikaci." : "Děkujeme za nákup!"}</p>
                 <Button onClick={handleFinalizeAndClose} disabled={isClosing} className="w-full h-14 active:scale-95 transition-transform font-bold text-lg">
                   <Scissors className="mr-2 h-5 w-5" /> Dokončit a uložit
                 </Button>
              </div>
            </div>

            {/* KONTEJNER PRO MASKU (Nůžky) */}
            {!isTorn && (
              <div className="absolute left-0 right-0 h-8 overflow-hidden z-[30]" style={{ top: 'calc(100% - 20px)' }}>
                <div 
                  className={cn(
                    "h-full bg-white transition-none will-change-transform origin-left",
                    isClosing && "animate-tear-reveal"
                  )} 
                  style={{ 
                    width: '101%', 
                    left: '-0.5%',
                    position: 'absolute',
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                    transform: isClosing ? undefined : 'scaleX(1)'
                  }} 
                />
              </div>
            )}

            {/* NEKONEČNÝ PAPÍR (Stub) */}
            <div className={cn(
              "absolute left-0 right-0 h-screen bg-white z-10 stub-paper shadow-lg",
              "top-[calc(100%-1px)]", 
              isTorn && "animate-fly-down"
            )} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
