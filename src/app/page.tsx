"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { 
  Minus, Plus, ShoppingCart, Loader2, Landmark, Wallet, 
  Tag, Eye, EyeOff, Receipt, Scissors, Search, Trash2, 
  Coins, Edit3, X, AlertTriangle, Sparkles, RotateCcw 
} from "lucide-react";
import type { Product, BankingDetails, Transaction, CartItem } from "@/lib/types";
import { 
  DEFAULT_PRODUCTS, 
  DEFAULT_CATEGORIES, 
  DEFAULT_MESSAGE, 
  DEFAULT_BANKING_DETAILS, 
  DEFAULT_POS_NAME,
  ALL_CASH_DENOMINATIONS,
  DEFAULT_CASH_DENOMINATIONS,
  CASH_DENOMINATIONS_STORAGE_KEY,
  LOW_STOCK_THRESHOLD
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { useDataContext } from "@/context/DataContext";
import { cn, generateVariableSymbol } from "@/lib/utils";
import { getImage } from "@/lib/db";

interface CartEntry {
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  isCustom?: boolean;
}

const ProductImage = ({ product, fill }: { product: Product; fill?: boolean }) => {
  const [imageUrl, setImageUrl] = useState<string>(() => {
    if (product.imageUrl && !product.imageUrl.startsWith('img_')) {
      return product.imageUrl;
    }
    return "https://placehold.co/400x400.png";
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      if (product.imageUrl?.startsWith('img_')) {
        const storedImage = await getImage(product.imageUrl);
        if (isMounted) {
          setImageUrl(storedImage || "https://placehold.co/400x400.png");
          setHasError(false);
        }
      } else if (product.imageUrl) {
        if (isMounted) {
          setImageUrl(product.imageUrl);
          setHasError(false);
        }
      } else {
        if (isMounted) {
          setImageUrl("https://placehold.co/400x400.png");
          setHasError(false);
        }
      }
    };
    loadImage();
    return () => {
      isMounted = false;
    };
  }, [product.imageUrl]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", fill ? "h-full w-full" : "h-40 w-40 rounded-md")}>
      <Image 
        src={hasError ? "https://placehold.co/400x400.png" : imageUrl} 
        alt={product.name} 
        fill={fill}
        unoptimized={true}
        onError={() => setHasError(true)}
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
  const { 
    products, 
    categories, 
    paymentMessage, 
    bankingDetails, 
    posName: currentPosName,
    recordSale,
    isProductEnabledOnDevice
  } = useDataContext();

  // Cart State (keyed by item identifier)
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  
  // Dialog States
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [cashHistory, setCashHistory] = useState<number[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentVs, setCurrentVs] = useState<string>('');

  // Filter & Search States
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Custom Item Modal State
  const [isCustomItemDialogOpen, setIsCustomItemDialogOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");

  // Price Override Modal State
  const [editingCartItem, setEditingCartItem] = useState<CartEntry | null>(null);
  const [overridePriceInput, setOverridePriceInput] = useState("");

  // Cash Denominations from Settings
  const [cashDenominations, setCashDenominations] = useState<number[]>(DEFAULT_CASH_DENOMINATIONS);
  const halfDenomIndex = useMemo(() => Math.ceil(cashDenominations.length / 2), [cashDenominations]);
  const leftDenominations = useMemo(() => cashDenominations.slice(0, halfDenomIndex), [cashDenominations, halfDenomIndex]);
  const rightDenominations = useMemo(() => cashDenominations.slice(halfDenomIndex), [cashDenominations, halfDenomIndex]);

  // Animation States
  const [isClosing, setIsClosing] = useState(false);
  const [isTorn, setIsTorn] = useState(false);
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cashInputRef = useRef<HTMLInputElement>(null);
  const isCashMode = paymentMode === 'cash';

  // Load cash denominations on mount
  useEffect(() => {
    if (isMounted) {
      try {
        const stored = localStorage.getItem(CASH_DENOMINATIONS_STORAGE_KEY);
        if (stored) setCashDenominations(JSON.parse(stored));
      } catch {}
    }
  }, [isMounted]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const triggerSuccessFlash = () => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setIsSuccessFlash(true);
    successTimeoutRef.current = setTimeout(() => {
      setIsSuccessFlash(false);
    }, 1200);
  };


  const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([60]);
      } catch (e) {}
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    triggerHapticFeedback();
    const existing = cart[product.id];
    const currentQty = existing ? existing.quantity : 0;
    
    if (currentQty >= product.stock) {
      toast({ 
        variant: "destructive", 
        title: "Nedostatek zboží", 
        description: `Na skladě je pouze ${product.stock} kusů.` 
      });
      return;
    }

    setCart(prev => ({
      ...prev,
      [product.id]: {
        productId: product.id,
        name: product.name,
        price: existing ? existing.price : product.price,
        originalPrice: product.price,
        quantity: currentQty + 1,
        isCustom: false,
      }
    }));
  };

  const removeFromCart = (cartKey: string) => {
    triggerHapticFeedback();
    setCart(prev => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[cartKey];
        return next;
      }
      return {
        ...prev,
        [cartKey]: { ...existing, quantity: existing.quantity - 1 }
      };
    });
  };

  const clearCart = () => {
    triggerHapticFeedback();
    setCart({});
  };

  const handleAddCustomItem = () => {
    const priceNum = parseFloat(customItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ variant: "destructive", title: "Neplatná částka", description: "Zadejte kladnou cenu položky." });
      return;
    }

    const name = customItemName.trim() || "Vlastní položka";
    const customId = `custom_${Date.now()}`;

    setCart(prev => ({
      ...prev,
      [customId]: {
        productId: customId,
        name,
        price: priceNum,
        originalPrice: priceNum,
        quantity: 1,
        isCustom: true,
      }
    }));

    triggerHapticFeedback();
    setIsCustomItemDialogOpen(false);
    setCustomItemName("");
    setCustomItemPrice("");
  };

  const handleSavePriceOverride = () => {
    if (!editingCartItem) return;
    const newPrice = parseFloat(overridePriceInput);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: "destructive", title: "Neplatná částka", description: "Cena musí být 0 Kč nebo vyšší." });
      return;
    }

    setCart(prev => {
      const existing = prev[editingCartItem.productId];
      if (!existing) return prev;
      return {
        ...prev,
        [editingCartItem.productId]: { ...existing, price: newPrice }
      };
    });

    triggerHapticFeedback();
    setEditingCartItem(null);
  };

  // Calculations
  const total = useMemo(() => {
    return Object.values(cart).reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const change = useMemo(() => {
    if (cashReceived === null) return null;
    return cashReceived - total;
  }, [cashReceived, total]);

  // Fast cash operations (multiple taps, undo, clear)
  const handleAddCashDenomination = (denom: number) => {
    triggerHapticFeedback();
    setCashReceived((prev) => {
      // If cash was set to exact total (and history is empty), replacing it with the chosen bill is expected
      if (cashHistory.length === 0 && prev === total && prev !== denom) {
        return denom;
      }
      const current = prev ?? 0;
      return current + denom;
    });
    setCashHistory((prev) => {
      if (prev.length === 0 && cashReceived === total && total !== denom) {
        return [denom];
      }
      return [...prev, denom];
    });
  };

  const handleUndoCash = () => {
    triggerHapticFeedback();
    if (cashHistory.length === 0) return;
    const lastDenom = cashHistory[cashHistory.length - 1];
    setCashHistory((prev) => prev.slice(0, -1));
    setCashReceived((prev) => {
      if (prev === null) return null;
      const next = prev - lastDenom;
      return next <= 0 ? null : next;
    });
  };

  const handleRemoveCashHistoryIndex = (indexToRemove: number) => {
    triggerHapticFeedback();
    const denom = cashHistory[indexToRemove];
    setCashHistory((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setCashReceived((prev) => {
      if (prev === null) return null;
      const next = prev - denom;
      return next <= 0 ? null : next;
    });
  };

  const handleClearCash = () => {
    triggerHapticFeedback();
    setCashReceived(null);
    setCashHistory([]);
  };

  const handleSetExactCash = () => {
    triggerHapticFeedback();
    setCashReceived(total);
    setCashHistory([]);
  };

  // Open checkout dialog
  const handleOpenDialog = () => {
    triggerHapticFeedback();
    setIsClosing(false);
    setIsTorn(false);

    if (isCashMode) {
      setCashReceived(null);
      setCashHistory([]);
      setIsCashDialogOpen(true);
    } else {
      // Generate new sequential Variable Symbol for this QR payment
      const vs = generateVariableSymbol();
      setCurrentVs(vs);
      setIsQrDialogOpen(true);
    }
  };
  
  const handleFinalizeAndClose = async () => {
    triggerHapticFeedback();
    setIsClosing(true);
    await new Promise(r => setTimeout(r, 400));
    setIsTorn(true);
    await new Promise(r => setTimeout(r, 800));
    
    // Immediate green flash feedback right as receipt flies away
    triggerSuccessFlash();
    saveTransaction();
    
    setIsQrDialogOpen(false);
    setIsCashDialogOpen(false);
    setCashReceived(null);
    setCashHistory([]);
    setCart({}); 
    setIsClosing(false);
    setIsTorn(false);
  };

  const saveTransaction = async () => {
    const cartEntries = Object.values(cart);
    if (cartEntries.length === 0) return;

    const transactionItems: CartItem[] = cartEntries.map(item => {
      const entry: CartItem = {
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isCustom: item.isCustom,
      };
      if (item.originalPrice !== undefined && item.originalPrice !== item.price) {
        entry.originalPrice = item.originalPrice;
      }
      return entry;
    });

    try {
      await recordSale(
        transactionItems, 
        total, 
        isCashMode ? 'cash' : 'qr',
        isCashMode ? undefined : currentVs
      );
    } catch (err: any) {
      console.error("Chyba při ukládání transakce:", err);
      toast({ 
        title: "Chyba", 
        description: `Transakci se nepodařilo uložit: ${err?.message || err}`, 
        variant: "destructive" 
      });
    }
  };

  // QR Code generator with SPAYD and X-VS
  const qrCodeData = useMemo(() => {
    const totalInWholeNumber = Math.round(total);
    const parts = [
      "SPD*1.0",
      `ACC:${bankingDetails.accountNumber}`,
      `RN:${bankingDetails.recipientName}`,
      `AM:${totalInWholeNumber}`,
      "CC:CZK"
    ];
    if (currentVs) {
      parts.push(`X-VS:${currentVs}`);
    }
    if (paymentMessage) {
      parts.push(`MSG:${paymentMessage}`);
    }
    return parts.join("*");
  }, [total, paymentMessage, bankingDetails, currentVs]);
  
  useEffect(() => {
    if (isQrDialogOpen && qrCodeData) {
      QRCode.toDataURL(qrCodeData, { errorCorrectionLevel: 'H', margin: 2, width: 256 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error(err));
    }
  }, [isQrDialogOpen, qrCodeData]);

  // Product filtering (with inline search, device enabled, category, out-of-stock)
  const visibleProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      if (p.enabled === false) return false;
      if (!isProductEnabledOnDevice(p.id)) return false;
      
      if (selectedCategory !== "all") {
        if (!p.category || p.category !== selectedCategory) return false;
      }
      
      if (!showOutOfStock && p.stock <= 0) return false;

      if (query) {
        const matchName = p.name.toLowerCase().includes(query);
        const matchCat = p.category ? p.category.toLowerCase().includes(query) : false;
        if (!matchName && !matchCat) return false;
      }
      
      return true;
    });
  }, [products, selectedCategory, showOutOfStock, isProductEnabledOnDevice, searchQuery]);

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Full-screen success flash overlay */}
      <div 
        className={cn(
          "fixed inset-0 pointer-events-none z-50 transition-all duration-300 ease-out",
          isSuccessFlash 
            ? "bg-emerald-500/25 dark:bg-emerald-500/30 ring-8 ring-inset ring-emerald-500/50 opacity-100" 
            : "bg-transparent opacity-0"
        )}
        aria-hidden="true"
      />

      <div className="container mx-auto max-w-7xl p-3 sm:p-5 md:p-6 pb-32 lg:pb-8">
        
        {/* MAIN LAYOUT: Split into Products (Left) and Sticky POS Sidebar (Right on Landscape/Desktop) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* LEFT COLUMN: Controls, Categories and Product Grid */}
          <div className="flex-1 w-full min-w-0">
            
            {/* Top Bar: Payment Mode Switch, Inline Search, Eye Toggle */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Payment Mode */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                  <Wallet className={cn("h-5 w-5", isCashMode ? "text-primary" : "text-muted-foreground")} />
                  <Switch 
                    id="payment-mode" 
                    checked={!isCashMode} 
                    onCheckedChange={(checked) => { 
                      triggerHapticFeedback(); 
                      setPaymentMode(checked ? 'qr' : 'cash'); 
                    }} 
                    aria-label="Přepnout režim platby" 
                  />
                  <Landmark className={cn("h-5 w-5", !isCashMode ? "text-primary" : "text-muted-foreground")} />
                  <Label htmlFor="payment-mode" className="text-sm sm:text-base font-medium hidden sm:inline">
                    {isCashMode ? "Hotovost" : "QR platba"}
                  </Label>
                </div>

                {/* Compact Inline Search on the SAME row */}
                <div className="relative flex-1 max-w-xs sm:max-w-md">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input 
                    placeholder="Hledat produkt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8 h-9 text-xs sm:text-sm bg-muted/30 border-muted rounded-full focus-visible:ring-1"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      aria-label="Vymazat hledání"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Eye toggle button */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { 
                    triggerHapticFeedback(); 
                    setShowOutOfStock(!showOutOfStock); 
                  }} 
                  className={cn("shrink-0", showOutOfStock ? "text-primary bg-primary/10" : "text-muted-foreground")}
                  title={showOutOfStock ? "Skrýt vyprodané" : "Zobrazit i vyprodané"}
                >
                  {showOutOfStock ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </Button>
              </div>

              {/* Categories Scroll Area */}
              <ScrollArea className="w-full">
                <div className="flex space-x-2 pb-1">
                  <Button 
                    variant={selectedCategory === "all" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => { triggerHapticFeedback(); setSelectedCategory("all"); }} 
                    className="whitespace-nowrap rounded-full h-8 text-xs font-medium"
                  >
                    Vše
                  </Button>
                  {categories.map((cat) => (
                    <Button 
                      key={cat} 
                      variant={selectedCategory === cat ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => { triggerHapticFeedback(); setSelectedCategory(cat); }} 
                      className="whitespace-nowrap rounded-full h-8 text-xs font-medium"
                    >
                      <Tag className="mr-1.5 h-3 w-3" />
                      {cat}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
              </ScrollArea>
            </div>

            {/* Product Grid */}
            <div className={cn("grid gap-3 sm:gap-4", columnView === '2-col' ? "grid-cols-2" : "grid-cols-3", "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5")}>
              
              {/* Permanent Card: "+ Vlastní položka" (Custom / Open Price) */}
              <Card 
                onClick={() => setIsCustomItemDialogOpen(true)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.02] hover:bg-primary/5 hover:border-primary transition-all cursor-pointer p-4 select-none aspect-square"
              >
                <div className="flex flex-col items-center justify-center flex-1 text-center my-auto">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-2 group-hover:scale-110 transition-transform">
                    <Coins className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-sm text-foreground">+ Vlastní položka</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Zadat volnou částku</span>
                </div>
              </Card>

              {/* Catalog Products */}
              {visibleProducts.map((product) => {
                const inCart = cart[product.id]?.quantity || 0;
                const remainingStock = product.stock - inCart;
                const isOutOfStock = remainingStock <= 0;
                const isLowStock = !isOutOfStock && remainingStock <= LOW_STOCK_THRESHOLD;

                return (
                  <Card 
                    key={product.id} 
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={cn(
                      "group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all select-none shadow-sm",
                      isOutOfStock ? "opacity-50 cursor-not-allowed border-destructive/30" : "cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]",
                      isLowStock && "border-amber-500/50 bg-amber-500/[0.02]",
                      inCart > 0 && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <div className="relative w-full aspect-square">
                      <ProductImage product={product} fill />
                      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-card/95 via-card/50 to-transparent z-10" />
                      
                      <div className="absolute bottom-3 left-3 right-3 text-card-foreground z-20 flex flex-col items-start">
                        <p className="font-bold text-base leading-tight truncate w-full">{product.name}</p>
                        <p className="text-2xl font-black text-primary brightness-110">{product.price.toFixed(0)} Kč</p>
                      </div>
                      
                      {inCart > 0 && (
                        <div className="absolute top-2 right-2 flex items-center bg-background/90 backdrop-blur-sm rounded-full p-0.5 shadow-lg z-30">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full hover:bg-muted" 
                            onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-lg font-bold w-7 text-center">{inCart}</span>
                        </div>
                      )}
                      
                      <Badge 
                        variant={remainingStock <= 5 ? "destructive" : "secondary"} 
                        className={cn(
                          "absolute top-2 left-2 flex items-center text-[11px] px-2 py-0.5 z-30 font-bold", 
                          remainingStock <= 0 ? "bg-destructive text-white" : isLowStock ? "bg-amber-500 text-white" : "bg-background/60 text-foreground border-none backdrop-blur-sm shadow-sm"
                        )}
                      >
                        {remainingStock <= 0 ? "VYPRODÁNO" : isLowStock ? `DOCHÁZÍ (${remainingStock} ks)` : `${remainingStock} ks`}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>

            {visibleProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Search className="h-10 w-10 stroke-[1.5] mb-2 opacity-50" />
                <p className="text-base font-semibold">Žádné produkty nenalezeny</p>
                <p className="text-xs mt-1">Zkuste upravit vyhledávání nebo zvolit jinou kategorii.</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Tablet / Desktop Landscape POS Sidebar */}
          <div className="hidden lg:flex flex-col w-80 xl:w-96 sticky top-20 border rounded-2xl bg-card shadow-sm overflow-hidden h-[calc(100vh-6rem)] shrink-0">
            {/* Sidebar Header */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Receipt className="h-4 w-4 text-primary" />
                <span>Aktuální účet</span>
                {totalItemsCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold">
                    {totalItemsCount}
                  </Badge>
                )}
              </div>
              {totalItemsCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCart} 
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                  title="Vysypat celý košík"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Vysypat
                </Button>
              )}
            </div>

            {/* Sidebar Cart Items (Scrollable) */}
            <ScrollArea className="flex-1 p-3">
              {totalItemsCount === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground my-auto">
                  <ShoppingCart className="h-12 w-12 stroke-[1.2] mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-semibold">Košík je prázdný</p>
                  <p className="text-xs mt-1 max-w-[200px]">Klepnutím na produkt jej přidáte k prodeji</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(cart).map(([cartKey, item]) => {
                    const isPriceModified = item.originalPrice !== undefined && item.price !== item.originalPrice;

                    return (
                      <div 
                        key={cartKey} 
                        className="p-2.5 rounded-xl border bg-background/50 hover:bg-background transition-colors flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-xs sm:text-sm block truncate">
                              {item.name}
                            </span>
                            {item.isCustom && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary">
                                Vlastní položka
                              </Badge>
                            )}
                          </div>

                          {/* Editable Price Tag */}
                          <button
                            onClick={() => {
                              setEditingCartItem(item);
                              setOverridePriceInput(String(item.price));
                            }}
                            className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors",
                              isPriceModified 
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" 
                                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                            )}
                            title="Klepnutím upravíte cenu pro tento nákup"
                          >
                            <span>{item.price} Kč</span>
                            <Edit3 className="h-2.5 w-2.5 opacity-60" />
                          </button>
                        </div>

                        {/* Quantity and Subtotal Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6 rounded-md" 
                              onClick={() => removeFromCart(cartKey)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-bold tabular-nums text-xs">
                              {item.quantity}
                            </span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-6 w-6 rounded-md" 
                              onClick={() => {
                                const prod = products.find(p => p.id === item.productId);
                                if (prod) addToCart(prod);
                                else {
                                  // For custom item, just increase quantity
                                  setCart(prev => ({
                                    ...prev,
                                    [cartKey]: { ...item, quantity: item.quantity + 1 }
                                  }));
                                }
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <span className="font-bold tabular-nums text-sm">
                            {(item.price * item.quantity).toFixed(0)} Kč
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Sidebar Bottom Checkout Panel */}
            {total > 0 && (
              <div className="p-4 border-t bg-muted/20 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">K úhradě</span>
                  <span className="text-3xl font-black text-primary tabular-nums tracking-tight">
                    {total.toFixed(0)} <span className="text-lg">Kč</span>
                  </span>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleOpenDialog} 
                  className="w-full h-12 text-base font-bold shadow-md active:scale-98 transition-transform"
                >
                  {isCashMode ? <Wallet className="mr-2 h-5 w-5" /> : <Landmark className="mr-2 h-5 w-5" />}
                  {isCashMode ? 'Zaplatit hotově' : 'Generovat QR'}
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR (Visible only on mobile/portrait, hidden on lg screens where sidebar is used) */}
      {total > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t p-3 sm:p-4 z-40 shadow-2xl">
          <div className="container mx-auto max-w-7xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearCart}
                className="text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0"
                title="Vysypat celý košík"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground uppercase font-bold block">Celkem ({totalItemsCount})</span>
                <span className="text-xl sm:text-2xl font-black text-primary tabular-nums">{total.toFixed(0)} Kč</span>
              </div>
            </div>

            <Button size="lg" onClick={handleOpenDialog} className="h-12 px-5 font-bold active:scale-95 transition-transform shrink-0">
              {isCashMode ? <Wallet className="mr-2 h-5 w-5" /> : <Landmark className="mr-2 h-5 w-5" />}
              {isCashMode ? 'Zaplatit hotově' : 'Generovat QR'}
            </Button>
          </div>
        </div>
      )}

      {/* MODAL: Custom Item Dialog ("+ Vlastní položka") */}
      <Dialog open={isCustomItemDialogOpen} onOpenChange={setIsCustomItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" /> Přidat vlastní položku
            </DialogTitle>
            <DialogDescription>
              Namarkujte libovolnou položku s vlastní částkou bez nutnosti zakládat produkt v databázi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="custom-item-name">Název položky (volitelné)</Label>
              <Input 
                id="custom-item-name" 
                placeholder="např. Vratný kelímek, Taška, Služba"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-item-price">Částka v Kč *</Label>
              <div className="relative">
                <Input 
                  id="custom-item-price" 
                  type="number"
                  placeholder="0"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  className="text-xl font-bold pr-10"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Kč</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rychlé šablony:</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Vratný kelímek", price: 50 },
                  { name: "Papírová taška", price: 10 },
                  { name: "Mimořádná položka", price: 100 },
                  { name: "Záloha", price: 200 },
                ].map((preset) => (
                  <Button 
                    key={preset.name}
                    variant="outline" 
                    size="sm" 
                    type="button"
                    onClick={() => {
                      setCustomItemName(preset.name);
                      setCustomItemPrice(String(preset.price));
                    }}
                    className="h-7 text-xs rounded-full"
                  >
                    {preset.name} ({preset.price} Kč)
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsCustomItemDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleAddCustomItem} className="font-semibold">Vložit do košíku</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Temporary Price Override ("Úprava ceny") */}
      <Dialog open={!!editingCartItem} onOpenChange={(open) => !open && setEditingCartItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" /> Úprava ceny pro tento nákup
            </DialogTitle>
            <DialogDescription>
              {editingCartItem?.name} • Původní cena v katalogu: <strong>{editingCartItem?.originalPrice} Kč</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="override-price">Nová cena za kus (Kč)</Label>
              <div className="relative">
                <Input 
                  id="override-price"
                  type="number"
                  value={overridePriceInput}
                  onChange={(e) => setOverridePriceInput(e.target.value)}
                  className="text-2xl font-bold pr-10 h-12"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Kč</span>
              </div>
              <p className="text-xs text-muted-foreground">Tato změna platí pouze pro tuto objednávku. Cena v katalogu zůstává nezměněna.</p>
            </div>

            {/* Quick Percentage Discounts */}
            {editingCartItem && editingCartItem.originalPrice > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rychlá sleva z původní ceny:</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "-10 %", val: Math.round(editingCartItem.originalPrice * 0.9) },
                    { label: "-20 %", val: Math.round(editingCartItem.originalPrice * 0.8) },
                    { label: "-50 %", val: Math.round(editingCartItem.originalPrice * 0.5) },
                    { label: "Zdarma", val: 0 },
                  ].map((disc) => (
                    <Button 
                      key={disc.label} 
                      variant="outline" 
                      size="sm" 
                      type="button"
                      onClick={() => setOverridePriceInput(String(disc.val))}
                      className="text-xs"
                    >
                      {disc.label} ({disc.val} Kč)
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingCartItem(null)}>Zrušit</Button>
            <Button onClick={handleSavePriceOverride} className="font-semibold">Uložit novou cenu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHECKOUT RECEIPT DIALOG (Animated Tear Receipt + Fast Cash & Auto VS) */}
      <Dialog open={isQrDialogOpen || isCashDialogOpen} onOpenChange={(open) => !open && !isClosing && handleFinalizeAndClose()}>
        <DialogContent 
          className={cn(
            "p-0 bg-transparent border-none shadow-none focus-visible:outline-none overflow-visible [&>button]:hidden",
            isCashDialogOpen ? "max-w-[360px] md:max-w-4xl lg:max-w-5xl w-full" : "max-w-[360px]"
          )} 
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8 w-full">
            
            {/* LEFT WING (Tablets / PC Landscape): Lower Denominations */}
            {isCashDialogOpen && (
              <div className={cn(
                "hidden md:flex flex-col gap-3 justify-center w-32 sm:w-36 md:w-40 lg:w-44 shrink-0 z-30 transition-all duration-300",
                isClosing ? "opacity-0 scale-95 pointer-events-none" : "animate-in fade-in slide-in-from-left-6"
              )}>
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Coins className="h-4 w-4" />
                  <span>Bankovky</span>
                </div>
                {leftDenominations.map((denom) => {
                  const count = cashHistory.filter(x => x === denom).length;
                  const isSelected = count > 0 || (cashHistory.length === 0 && cashReceived === denom);
                  return (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => handleAddCashDenomination(denom)}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-20 sm:h-22 md:h-24 rounded-2xl border-2 transition-all active:scale-95 shadow-xl select-none group",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary ring-4 ring-primary/30 font-black shadow-primary/20 scale-[1.02]"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700/80 hover:border-zinc-500 backdrop-blur-md"
                      )}
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl lg:text-3xl font-black tabular-nums">+{denom}</span>
                        <span className="text-sm font-semibold opacity-80">Kč</span>
                      </div>
                      {count > 0 && (
                        <span className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white font-black text-xs h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center shadow-lg border-2 border-zinc-900 animate-in zoom-in-75">
                          {count}×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CENTER: RECEIPT PAPER (Animated print/tear) */}
            <div className={cn(
              "relative w-[340px] sm:w-[360px] shrink-0",
              !isClosing && "animate-receipt-print"
            )}>
              <div className={cn(
                "receipt-paper bg-white p-6 sm:p-7 pb-10 w-full relative z-20 text-zinc-900 shadow-2xl",
                isTorn && "animate-fly-up"
              )}>
                {/* Receipt Header */}
                <div className="w-full text-center border-b border-dashed border-zinc-300 pb-3 mb-3">
                   <div className="flex items-center justify-center gap-2 mb-1 text-zinc-800">
                     <Receipt className="h-5 w-5" />
                     <DialogTitle className="text-xs font-bold uppercase tracking-[0.2em]">
                       {isCashDialogOpen ? "Účtenka / Hotovost" : "Účtenka / QR Platba"}
                     </DialogTitle>
                   </div>
                   <DialogDescription className="text-[10px] text-zinc-700 font-bold uppercase">
                     {currentPosName} • {new Date().toLocaleString('cs-CZ')}
                   </DialogDescription>
                   
                   {/* Auto-generated Variable Symbol indicator for QR payments */}
                   {isQrDialogOpen && currentVs && (
                     <p className="text-[11px] font-black tracking-widest text-primary mt-1">
                       VS: {currentVs}
                     </p>
                   )}
                </div>

                {/* Total Amount */}
                <div className="text-center w-full mb-4">
                  <p className="text-xs font-bold text-zinc-600 mb-0.5 uppercase tracking-wider">K úhradě</p>
                  <p className="text-4xl sm:text-5xl font-black text-primary tabular-nums tracking-tight">
                    {total.toFixed(0)} <span className="text-2xl ml-1">Kč</span>
                  </p>
                </div>

                {/* QR Payment View */}
                {isQrDialogOpen && (
                  <div className="p-3 bg-white rounded-lg shadow-inner mb-4 ring-1 ring-black/5">
                    {qrCodeDataUrl ? (
                      <Image src={qrCodeDataUrl} alt="QR Code" width={220} height={220} className="mx-auto" />
                    ) : (
                      <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-50">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                )}

                {/* Cash Payment View with Fast Cash Presets */}
                {isCashDialogOpen && (
                  <div className="space-y-3 mb-4 w-full">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cash-received" className="text-xs font-bold uppercase text-zinc-700 tracking-wider">
                          Přijato
                        </Label>
                        {cashReceived !== null && cashReceived > 0 && (
                          <button
                            type="button"
                            onClick={handleClearCash}
                            className="text-[11px] font-bold text-destructive hover:underline flex items-center gap-0.5"
                          >
                            <X className="h-3 w-3" /> Vynulovat
                          </button>
                        )}
                      </div>
                      <div className="relative">
                         <input 
                           ref={cashInputRef} 
                           id="cash-received" 
                           type="number" 
                           inputMode="numeric"
                           placeholder="0" 
                           value={cashReceived ?? ""} 
                           onChange={(e) => {
                             const val = e.target.value === '' ? null : parseFloat(e.target.value);
                             setCashReceived(val);
                             setCashHistory([]);
                           }} 
                           className="w-full text-center text-2xl h-12 font-bold bg-muted/20 border-dashed border-2 text-zinc-900 focus:outline-none rounded-md px-10" 
                         />
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold pointer-events-none">Kč</div>
                         {cashReceived !== null && cashReceived > 0 && (
                           <button
                             type="button"
                             onClick={handleClearCash}
                             className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1"
                             title="Vynulovat"
                             aria-label="Vynulovat částku"
                           >
                             <X className="h-4 w-4" />
                           </button>
                         )}
                      </div>
                    </div>

                    {/* FAST CASH: Standalone [PŘESNĚ] button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSetExactCash}
                      className={cn(
                        "w-full h-9 font-bold text-xs border-2 transition-all",
                        cashReceived === total 
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800" 
                          : "border-primary/40 text-primary hover:bg-primary/5"
                      )}
                    >
                      ✓ Přesně: {total.toFixed(0)} Kč
                    </Button>

                    {/* MOBILE ONLY (< md): Small Denominations Grid */}
                    <div className="block md:hidden space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Rychlá volba bankovky:
                        </span>
                        {cashHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={handleUndoCash}
                            className="flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-all active:scale-95 shadow-2xs"
                            title="Vrátit poslední přidanou bankovku"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Zpět (-{cashHistory[cashHistory.length - 1]} Kč)
                          </button>
                        )}
                      </div>

                      {/* Mobile breakdown pills if multiple banknotes/coins were tapped */}
                      {cashHistory.length > 1 && (
                        <div className="flex items-center gap-1 flex-wrap text-[11px] bg-zinc-100/90 p-1.5 rounded-md border border-dashed border-zinc-200">
                          <span className="font-semibold text-zinc-500 text-[10px] uppercase mr-0.5">Složeno:</span>
                          {cashHistory.map((item, idx) => (
                            <span 
                              key={idx} 
                              onClick={() => handleRemoveCashHistoryIndex(idx)}
                              className="inline-flex items-center gap-0.5 bg-white border border-zinc-300 rounded px-1.5 py-0.5 font-bold text-zinc-800 cursor-pointer hover:bg-red-50 hover:border-red-300 hover:text-destructive transition-colors group shadow-2xs"
                              title="Kliknutím odeberete tuto bankovku"
                            >
                              +{item}
                              <X className="h-2.5 w-2.5 text-zinc-400 group-hover:text-destructive" />
                            </span>
                          ))}
                          <span className="ml-auto font-black text-zinc-900">
                            = {cashReceived} Kč
                          </span>
                        </div>
                      )}

                      {/* Mobile Denominations Grid */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {cashDenominations.map((denom) => {
                          const count = cashHistory.filter(x => x === denom).length;
                          const isSelected = count > 0 || (cashHistory.length === 0 && cashReceived === denom);
                          return (
                            <Button
                              key={denom}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddCashDenomination(denom)}
                              className={cn(
                                "relative h-9 text-xs font-bold transition-all px-1 flex items-center justify-center active:scale-95",
                                isSelected 
                                  ? "bg-primary/10 border-primary text-primary font-black shadow-2xs" 
                                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200"
                              )}
                            >
                              <span>+{denom} Kč</span>
                              {count > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow">
                                  {count}×
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TABLETS / PC (md+): Large "Složeno" card inside the receipt */}
                    <div className="hidden md:block p-3.5 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200 text-center space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Složeno hotovostí:
                        </span>
                        {cashHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={handleUndoCash}
                            className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-2xs"
                            title="Vrátit poslední přidanou bankovku"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Zpět (-{cashHistory[cashHistory.length - 1]} Kč)
                          </button>
                        )}
                      </div>

                      {cashHistory.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2 flex-wrap max-h-36 overflow-y-auto p-1">
                            {cashHistory.map((item, idx) => (
                              <span 
                                key={idx} 
                                onClick={() => handleRemoveCashHistoryIndex(idx)}
                                className="inline-flex items-center gap-1.5 bg-white border-2 border-zinc-300 rounded-lg px-2.5 py-1 font-black text-sm text-zinc-900 cursor-pointer hover:bg-red-50 hover:border-red-400 hover:text-destructive transition-colors group shadow-sm"
                                title="Kliknutím odeberete tuto bankovku"
                              >
                                +{item} Kč
                                <X className="h-3.5 w-3.5 text-zinc-400 group-hover:text-destructive" />
                              </span>
                            ))}
                          </div>
                          <div className="text-xs font-bold text-zinc-600 border-t border-dashed border-zinc-200 pt-1.5 flex items-center justify-between">
                            <span>Celkem zadáno:</span>
                            <span className="text-primary text-base font-black">{cashReceived} Kč</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2.5 text-xs font-medium text-zinc-400 flex items-center justify-center gap-2">
                          <span>👈 Zvolte bankovky po stranách 👉</span>
                        </div>
                      )}
                    </div>

                    {/* Calculated Change */}
                    <div className={cn("smooth-expand-container", change !== null ? "is-open" : "")}>
                      <div className="min-h-0 pt-1">
                        <div className="p-3 bg-zinc-50 rounded-lg border border-dashed border-zinc-200 text-center">
                          <p className="text-xs font-bold uppercase text-zinc-700 mb-0.5">
                            {change !== null && change >= 0 ? "Vrátit" : "Doplatit"}
                          </p>
                          <p className={cn("text-3xl font-black tabular-nums", change !== null && change >= 0 ? "text-primary" : "text-destructive")}>
                            {change !== null ? Math.abs(change).toFixed(0) : "0"} <span className="text-lg">Kč</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Receipt Footer Action */}
                <div className="w-full text-center border-t border-dashed border-zinc-300 pt-3 mt-1">
                   <p className="text-[11px] text-zinc-700 font-bold italic mb-4">
                     {isQrDialogOpen ? "Skenujte kód v bankovní aplikaci." : "Děkujeme za nákup!"}
                   </p>
                   <Button onClick={handleFinalizeAndClose} disabled={isClosing} className="w-full h-12 active:scale-95 transition-transform font-bold text-base shadow">
                     <Scissors className="mr-2 h-5 w-5" /> Dokončit a uložit
                   </Button>
                </div>
              </div>

              {/* Receipt Tear Visual Effect */}
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

              <div className={cn(
                "absolute left-0 right-0 h-screen bg-white z-10 stub-paper shadow-lg",
                "top-[calc(100%-1px)]", 
                isTorn && "animate-fly-down"
              )} />
            </div>

            {/* RIGHT WING (Tablets / PC Landscape): Higher Denominations */}
            {isCashDialogOpen && (
              <div className={cn(
                "hidden md:flex flex-col gap-3 justify-center w-32 sm:w-36 md:w-40 lg:w-44 shrink-0 z-30 transition-all duration-300",
                isClosing ? "opacity-0 scale-95 pointer-events-none" : "animate-in fade-in slide-in-from-right-6"
              )}>
                <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Coins className="h-4 w-4" />
                  <span>Bankovky</span>
                </div>
                {rightDenominations.map((denom) => {
                  const count = cashHistory.filter(x => x === denom).length;
                  const isSelected = count > 0 || (cashHistory.length === 0 && cashReceived === denom);
                  return (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => handleAddCashDenomination(denom)}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-20 sm:h-22 md:h-24 rounded-2xl border-2 transition-all active:scale-95 shadow-xl select-none group",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary ring-4 ring-primary/30 font-black shadow-primary/20 scale-[1.02]"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-white border-zinc-700/80 hover:border-zinc-500 backdrop-blur-md"
                      )}
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl lg:text-3xl font-black tabular-nums">+{denom}</span>
                        <span className="text-sm font-semibold opacity-80">Kč</span>
                      </div>
                      {count > 0 && (
                        <span className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white font-black text-xs h-6 min-w-6 px-1.5 rounded-full flex items-center justify-center shadow-lg border-2 border-zinc-900 animate-in zoom-in-75">
                          {count}×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
