"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Product, BankingDetails } from "@/lib/types";
import { getProductCategories } from "@/lib/types";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_MESSAGE,
  DEFAULT_BANKING_DETAILS,
  DEFAULT_POS_NAME,
  SETTINGS_ACCORDION_STATE_KEY,
  ALL_CASH_DENOMINATIONS,
  DEFAULT_CASH_DENOMINATIONS,
  CASH_DENOMINATIONS_STORAGE_KEY,
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useAppContext } from "@/context/AppContext";
import { useDataContext } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth-modal";
import SyncStatusBadge from "@/components/sync-status-badge";
import ProductForm from "@/components/product-form";
import { 
  Plus, Edit, Trash2, Loader2, Sun, Moon, Laptop, Download, 
  Trash, RefreshCcw, Smartphone, X, LayoutGrid, Rows, 
  Tag, Boxes, TrendingUp, MonitorSmartphone, CheckCircle2, Cloud,
  ArrowUp, ArrowDown, ArrowDownAZ
} from "lucide-react";
import { deleteImage, getAllImageKeys } from "@/lib/db";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function SettingsPage() {
  const isMounted = useIsMounted();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { columnView, setColumnView } = useAppContext();
  const {
    products,
    categories,
    transactions,
    bankingDetails: ctxBankingDetails,
    paymentMessage: ctxPaymentMessage,
    posName: ctxPosName,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductEnabled: ctxToggleProductEnabled,
    isProductEnabledOnDevice,
    toggleProductDeviceEnabled,
    enableAllProductsOnDevice,
    deviceProductOrder,
    moveProductOrder,
    resetProductOrderToAlphabetical,
    addCategory,
    deleteCategory,
    saveCategories,
    saveBankingDetails,
    savePaymentMessage,
    savePosName,
    clearAllTransactions,
  } = useDataContext();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [posName, setPosName] = useState(DEFAULT_POS_NAME);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<string[]>(['item-products', 'item-category']);

  const [cashDenominations, setCashDenominations] = useState<number[]>(DEFAULT_CASH_DENOMINATIONS);

  useEffect(() => {
    if (isMounted) {
      try {
        const stored = localStorage.getItem(CASH_DENOMINATIONS_STORAGE_KEY);
        if (stored) setCashDenominations(JSON.parse(stored));
      } catch {}
    }
  }, [isMounted]);

  const toggleCashDenomination = (denom: number) => {
    let updated: number[];
    if (cashDenominations.includes(denom)) {
      if (cashDenominations.length <= 1) {
        toast({ variant: "destructive", title: "Upozornění", description: "Musí zůstat povolen alespoň jeden nominál." });
        return;
      }
      updated = cashDenominations.filter(d => d !== denom);
    } else {
      updated = [...cashDenominations, denom].sort((a, b) => a - b);
    }
    setCashDenominations(updated);
    localStorage.setItem(CASH_DENOMINATIONS_STORAGE_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (ctxBankingDetails) setBankingDetails(ctxBankingDetails);
  }, [ctxBankingDetails]);

  useEffect(() => {
    if (ctxPaymentMessage) setMessage(ctxPaymentMessage);
  }, [ctxPaymentMessage]);

  useEffect(() => {
    if (ctxPosName) setPosName(ctxPosName);
  }, [ctxPosName]);

  useEffect(() => {
    if (isMounted) {
      const storedAccordionState = localStorage.getItem(SETTINGS_ACCORDION_STATE_KEY);
      if (storedAccordionState) setOpenAccordions(JSON.parse(storedAccordionState));
    }
  }, [isMounted]);

  const handleAccordionChange = (value: string[]) => {
    setOpenAccordions(value);
    localStorage.setItem(SETTINGS_ACCORDION_STATE_KEY, JSON.stringify(value));
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const orderedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (deviceProductOrder && deviceProductOrder.length > 0) {
        const idxA = deviceProductOrder.indexOf(a.id);
        const idxB = deviceProductOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }
      return a.name.localeCompare(b.name, 'cs');
    });
  }, [products, deviceProductOrder]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName);
    setNewCategoryName("");
    toast({ title: "Úspěch", description: "Kategorie přidána." });
  };

  const handleDeleteCategory = async (cat: string) => {
    await deleteCategory(cat);
    toast({ title: "Úspěch", description: "Kategorie smazána." });
  };

  const handleAddProduct = async (productData: Omit<Product, "id">) => {
    await addProduct(productData);
    toast({ title: "Úspěch", description: "Produkt vytvořen a synchronizován." });
    setIsSheetOpen(false);
  };

  const handleEditProduct = async (product: Product | Omit<Product, "id">) => {
    if (!('id' in product)) return;
    await updateProduct(product as Product);
    toast({ title: "Úspěch", description: "Produkt aktualizován a synchronizován." });
    setIsSheetOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    toast({ title: "Úspěch", description: "Produkt smazán." });
  };
  
  const handleSaveQrSettings = async () => {
    await saveBankingDetails(bankingDetails);
    await savePaymentMessage(message);
    toast({ title: "Úspěch", description: "Nastavení QR platby uloženo a synchronizováno." });
  };

  const handleSavePosName = async () => {
    await savePosName(posName);
    toast({ title: "Úspěch", description: "Název pokladny uložen pro toto zařízení." });
  };

  const handleExportHistory = () => {
    if (transactions.length === 0) {
      return toast({ variant: "destructive", title: "Chyba", description: "Žádná historie k exportu." });
    }
    const flattenedData = transactions.flatMap(tx => tx.items.map(item => ({
      'ID Transakce': tx.id,
      'Pokladna': tx.posName || 'Neznámá',
      'Datum': new Date(tx.date).toLocaleString('cs-CZ'),
      'Celkem': tx.total,
      'Metoda': tx.paymentMethod === 'cash' ? 'Hotově' : 'QR',
      'Produkt': item.name,
      'Množství': item.quantity,
      'Cena': item.price
    })));
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transakce");
    XLSX.writeFile(workbook, "historie-transakci.xlsx");
  };

  const handleClearHistory = async () => {
    await clearAllTransactions();
    toast({ title: "Úspěch", description: "Historie vymazána." });
  };
  
  const handleRestoreDefaultProducts = async () => {
    const currentImageKeys = await getAllImageKeys();
    for (const key of currentImageKeys) await deleteImage(key);
    for (const p of products) {
      await deleteProduct(p.id);
    }
    for (const p of DEFAULT_PRODUCTS) {
      await addProduct(p);
    }
    await saveCategories(DEFAULT_CATEGORIES);
    toast({ title: "Úspěch", description: "Výchozí stav obnoven." });
  };

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Nastavení</h1>
        <p className="text-muted-foreground text-sm">Správa cloudové synchronizace, sortimentu pokladny, vzhledu a dat.</p>
      </div>

      {/* 1. CLOUDOVÁ SYNCHRONIZACE & POKLADNÍ ÚČET */}
      <Card className="border-primary/30 shadow-sm overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.03]">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold">Cloudová synchronizace</h2>
                  <SyncStatusBadge onOpenAuth={() => setIsAuthModalOpen(true)} />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {user 
                    ? `Přihlášeno k účtu ${user.email} • Všechny pokladny sdílejí data v reálném čase`
                    : "Pokladna běží v lokálním offline profilu. Přihlaste se pro synchronizaci mezi zařízeními."}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setIsAuthModalOpen(true)} 
              variant={user ? "outline" : "default"}
              className="shrink-0 font-medium"
            >
              {user ? "Správa účtu / Odhlásit" : "Přihlásit pokladnu"}
            </Button>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pos-name" className="text-sm font-semibold flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4 text-primary" />
                  Název této pokladny
                </Label>
                <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Pouze toto zařízení
                </span>
              </div>
              <div className="flex gap-2">
                <Input 
                  id="pos-name"
                  value={posName} 
                  onChange={(e) => setPosName(e.target.value)}
                  placeholder="např. Bar - Pokladna 1"
                  className="font-medium"
                />
                <Button onClick={handleSavePosName} variant="secondary">
                  Uložit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tento název identifikuje toto konkrétní zařízení na účtenkách a v manažerském přehledu tržeb. Každá pokladna má svůj vlastní název a nesynchronizuje se po celém účtu.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-xs text-muted-foreground">Společný katalog</div>
                <div className="text-xl font-bold mt-0.5">{products.length} položek</div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-xs text-muted-foreground">Celkem transakcí</div>
                <div className="text-xl font-bold mt-0.5">{transactions.length} prodejů</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground border-t">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span><strong>Funguje i offline:</strong> Prodeje se ukládají lokálně v zařízení a synchronizují se hned po připojení.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span><strong>Okamžitý push skladů:</strong> Jakmile jedna kasa prodá zboží, ostatním se ihned poníží stav na displeji.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. RYCHLÉ PŘEHLEDY & ANALÝZY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <CardHeader className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Manažerský přehled</CardTitle>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">Nové</Badge>
                </div>
                <CardDescription className="text-xs">Denní & hodinové heat mapy, tržby, zisk a pokladny.</CardDescription>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <Link href="/manager">Otevřít dashboard</Link>
            </Button>
          </CardHeader>
        </Card>

        <Card className="border-primary/20 bg-primary/5 hover:border-primary/40 transition-all">
          <CardHeader className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Inventura & Sklad</CardTitle>
                <CardDescription className="text-xs">Podrobná analýza marží, skladové zásoby a ziskovost.</CardDescription>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href="/inventory">Otevřít Inventuru</Link>
            </Button>
          </CardHeader>
        </Card>
      </div>

      {/* 3. HLAVNÍ NASTAVENÍ (ACCORDION) */}
      <Accordion 
        type="multiple" 
        value={openAccordions}
        onValueChange={handleAccordionChange}
        className="w-full space-y-4"
      >
        {/* SPRÁVA PRODUKTŮ */}
        <AccordionItem value="item-products" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 hover:no-underline">
              <CardHeader className="p-0 text-left">
                <CardTitle className="text-lg">Správa produktů</CardTitle>
                <CardDescription>
                  Společný katalog produktů a zásob. Šipkami určete pořadí zobrazení na této pokladně. Přepínač &quot;Na této pokladně&quot; určuje, které produkty se nabízejí k prodeji na tomto konkrétním zařízení.
                </CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <Button 
                  onClick={() => { setEditingProduct(null); setIsSheetOpen(true); }} 
                  className="h-10"
                >
                  <Plus className="mr-2 h-4 w-4" /> Přidat produkt
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      resetProductOrderToAlphabetical();
                      toast({ title: "Pořadí produktů resetováno na abecední (A-Z)." });
                    }}
                    title="Obnovit výchozí abecední řazení"
                  >
                    <ArrowDownAZ className="mr-1.5 h-4 w-4" /> Seřadit A-Z
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      enableAllProductsOnDevice();
                      toast({ title: "Všechny produkty povoleny na této pokladně." });
                    }}
                  >
                    Povolit vše na této kase
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20 text-center">Pořadí</TableHead>
                      <TableHead>Název</TableHead>
                      <TableHead>Kat.</TableHead>
                      <TableHead>Sklad</TableHead>
                      <TableHead className="text-center">Na této pokladně</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedProducts.map((p, index) => {
                      const cats = getProductCategories(p);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs text-muted-foreground font-mono w-5 text-right">{index + 1}.</span>
                              <div className="flex flex-col gap-0.5">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 p-0 hover:bg-muted"
                                  disabled={index === 0}
                                  onClick={() => moveProductOrder(p.id, 'up')}
                                  title="Posunout nahoru"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 p-0 hover:bg-muted"
                                  disabled={index === orderedProducts.length - 1}
                                  onClick={() => moveProductOrder(p.id, 'down')}
                                  title="Posunout dolů"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            {cats.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {cats.map((cat) => (
                                  <Badge key={cat} variant="secondary" className="text-[11px] px-2 py-0.5 font-normal">
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{p.stock} ks</TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={isProductEnabledOnDevice(p.id)} 
                            onCheckedChange={(checked) => {
                              toggleProductDeviceEnabled(p.id, checked);
                              toast({
                                title: checked ? "Produkt aktivován na této pokladně" : "Produkt skryt na této pokladně",
                                description: `Změna platí pouze pro toto zařízení (${p.name}).`,
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setEditingProduct(p); setIsSheetOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Smazat produkt?</AlertDialogTitle>
                                <AlertDialogDescription>Produkt bude smazán ze společného katalogu.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(p.id)}>Smazat</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* SPRÁVA KATEGORIÍ */}
        <AccordionItem value="item-category" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 hover:no-underline">
              <CardHeader className="p-0 text-left">
                <CardTitle className="text-lg">Správa kategorií</CardTitle>
                <CardDescription>Definujte kategorie pro organizaci vašeho sortimentu.</CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Název nové kategorie" 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button onClick={handleAddCategory} className="h-10 px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground pl-3 pr-1.5 py-1 rounded-full text-sm">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span>{cat}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 rounded-full hover:text-destructive" 
                      onClick={() => handleDeleteCategory(cat)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* QR PLATBA */}
        <AccordionItem value="item-qr" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 hover:no-underline">
              <CardHeader className="p-0 text-left">
                <CardTitle className="text-lg">QR Platba & Bankovní údaje</CardTitle>
                <CardDescription>Bankovní údaje pro generování platebních QR kódů na pokladně.</CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="space-y-2">
                <Label>Jméno příjemce platby</Label>
                <Input 
                  value={bankingDetails.recipientName} 
                  onChange={(e) => setBankingDetails({ ...bankingDetails, recipientName: e.target.value })} 
                  placeholder="např. Moje Provozovna s.r.o."
                />
              </div>
              <div className="space-y-2">
                <Label>Číslo účtu / IBAN</Label>
                <Input 
                  value={bankingDetails.accountNumber} 
                  onChange={(e) => setBankingDetails({ ...bankingDetails, accountNumber: e.target.value })} 
                  placeholder="např. CZ1234567890123456789012 nebo 123456789/0800"
                />
              </div>
              <div className="space-y-2">
                <Label>Zpráva pro příjemce</Label>
                <Textarea 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  rows={2} 
                  placeholder="Děkujeme za Váš nákup!"
                />
              </div>
              <Button onClick={handleSaveQrSettings} className="w-full h-11">
                Uložit bankovní nastavení
              </Button>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* VZHLED & APLIKACE */}
        <AccordionItem value="item-appearance" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 hover:no-underline">
              <CardHeader className="p-0 text-left">
                <CardTitle className="text-lg">Vzhled & Aplikace</CardTitle>
                <CardDescription>Barevný motiv, rozložení pro mobil a instalace aplikace.</CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-6">
              {showInstallPrompt && (
                <Card className="bg-primary/10 border-primary relative">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setShowInstallPrompt(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Instalovat aplikaci do zařízení</CardTitle>
                    <CardDescription className="text-xs">Umožní spouštět pokladnu na celou obrazovku přímo z plochy i offline.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleInstallClick} className="w-full h-11" disabled={!deferredPrompt}>
                      <Smartphone className="mr-2 h-4 w-4" /> Instalovat na plochu (PWA)
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold">Barevný motiv</Label>
                  <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4 mt-3">
                    {['light', 'dark', 'system'].map((t) => (
                      <div key={t}>
                        <RadioGroupItem value={t} id={t} className="peer sr-only" />
                        <Label htmlFor={t} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary capitalize cursor-pointer">
                          {t === 'light' && <Sun className="h-6 w-6 mb-2" />}
                          {t === 'dark' && <Moon className="h-6 w-6 mb-2" />}
                          {t === 'system' && <Laptop className="h-6 w-6 mb-2" />}
                          {t === 'light' ? 'Světlý' : t === 'dark' ? 'Tmavý (AMOLED)' : 'Systém'}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Počet sloupců produktů na mobilu</Label>
                  <RadioGroup value={columnView} onValueChange={(v) => setColumnView(v as '2-col' | '3-col')} className="grid grid-cols-2 gap-4 mt-3">
                    {['2-col', '3-col'].map((v) => (
                      <div key={v}>
                        <RadioGroupItem value={v} id={v} className="peer sr-only" />
                        <Label htmlFor={v} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary cursor-pointer">
                          {v === '2-col' ? <Rows className="h-6 w-6 mb-2" /> : <LayoutGrid className="h-6 w-6 mb-2" />}
                          {v === '2-col' ? '2 Sloupce' : '3 Sloupce'}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="pt-2 border-t">
                  <div className="mb-2">
                    <Label className="text-sm font-semibold">Rychlé nominály hotovosti</Label>
                    <p className="text-xs text-muted-foreground">Vyberte bankovky a mince, které chcete mít k dispozici při platbě v hotovosti pod účtenkou.</p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3">
                    {ALL_CASH_DENOMINATIONS.map((denom) => {
                      const isChecked = cashDenominations.includes(denom);
                      return (
                        <label
                          key={denom}
                          className={cn(
                            "flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium select-none",
                            isChecked ? "border-primary/60 bg-primary/5 text-foreground" : "border-muted bg-muted/20 text-muted-foreground"
                          )}
                        >
                          <Checkbox 
                            checked={isChecked} 
                            onCheckedChange={() => toggleCashDenomination(denom)} 
                          />
                          <span>{denom} Kč</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ÚDRŽBA A SPRÁVA DAT */}
        <AccordionItem value="item-maintenance" className="border-none">
          <Card>
            <AccordionTrigger className="p-6 hover:no-underline">
              <CardHeader className="p-0 text-left">
                <CardTitle className="text-lg">Údržba dat & Export</CardTitle>
                <CardDescription>Export historie tržeb a správa stavu databáze.</CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 space-y-4">
              <div className="p-4 rounded-lg border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm">Export historie prodejů (Excel)</div>
                  <div className="text-xs text-muted-foreground">Stáhne tabulku se všemi transakcemi, položkami, časem a použitou pokladnou.</div>
                </div>
                <Button variant="outline" onClick={handleExportHistory} className="shrink-0">
                  <Download className="mr-2 h-4 w-4" /> Exportovat (.xlsx)
                </Button>
              </div>

              <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="h-11">
                      <Trash className="mr-2 h-4 w-4" /> Smazat historii tržeb
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Smazat celou historii tržeb?</AlertDialogTitle>
                      <AlertDialogDescription>Tato akce je nevratná a smaže všechny záznamy o prodejích.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory}>Smazat vše</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="h-11 text-destructive border-destructive/20 hover:bg-destructive/5">
                      <RefreshCcw className="mr-2 h-4 w-4" /> Obnovit výchozí produkty
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Obnovit výchozí produkty?</AlertDialogTitle>
                      <AlertDialogDescription>Smaže vaše stávající produkty a nahradí je ukázkovými daty.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestoreDefaultProducts}>Obnovit</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* MODÁL PRO PŘIDÁNÍ / ÚPRAVU PRODUKTU */}
      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Upravit produkt' : 'Přidat nový produkt'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] -mx-6 px-6">
            <ProductForm 
              onSubmit={editingProduct ? handleEditProduct : handleAddProduct} 
              product={editingProduct} 
              categories={categories}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* AUTH MODAL */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
