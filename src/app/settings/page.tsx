
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
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
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import type { Product, BankingDetails, Transaction } from "@/lib/types";
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
  SETTINGS_ACCORDION_STATE_KEY
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useAppContext } from "@/context/AppContext";
import ProductForm from "@/components/product-form";
import { Plus, Edit, Trash2, Loader2, Sun, Moon, Laptop, Upload, Download, Trash, RefreshCcw, Smartphone, X, LayoutGrid, Rows, BarChart3, PieChart as PieChartIcon, Tag, Boxes, TrendingUp, Calendar as CalendarIcon, FilterX, Eye, EyeOff } from "lucide-react";
import { deleteImage, getAllImageKeys, getImage } from "@/lib/db";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316'];

export default function SettingsPage() {
  const isMounted = useIsMounted();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { columnView, setColumnView } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [message, setMessage] = useState("");
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<string[]>(['item-1', 'item-2', 'item-category']);

  // Analytics Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [chartMode, setChartMode] = useState<"stacked" | "grouped">("stacked");
  const [showCost, setShowCost] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      setProducts(storedProducts ? JSON.parse(storedProducts) : DEFAULT_PRODUCTS);
      
      const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      setCategories(storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORIES);

      const storedMessage = localStorage.getItem(MESSAGE_STORAGE_KEY);
      setMessage(storedMessage ? JSON.parse(storedMessage) : DEFAULT_MESSAGE);
      const storedBankingDetails = localStorage.getItem(BANKING_DETAILS_STORAGE_KEY);
      setBankingDetails(storedBankingDetails ? JSON.parse(storedBankingDetails) : DEFAULT_BANKING_DETAILS);
      const storedAccordionState = localStorage.getItem(SETTINGS_ACCORDION_STATE_KEY);
      if (storedAccordionState) setOpenAccordions(JSON.parse(storedAccordionState));
    }
  }, [isMounted]);

  const availableYears = useMemo(() => {
    if (!isMounted) return [];
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];
    const years = new Set<string>();
    transactions.forEach(tx => {
      years.add(new Date(tx.date).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [isMounted]);

  const analyticsData = useMemo(() => {
    if (!isMounted) return { revenueByDay: [], topProducts: [] };
    
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];
    
    let filtered = transactions;

    if (selectedYear !== "all") {
      filtered = filtered.filter(tx => new Date(tx.date).getFullYear().toString() === selectedYear);
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.date);
        const start = dateFrom ? startOfDay(dateFrom) : new Date(0);
        const end = dateTo ? endOfDay(dateTo) : new Date(8640000000000000);
        return isWithinInterval(txDate, { start, end });
      });
    }

    const isFiltered = dateFrom || dateTo || selectedYear !== "all";

    const revenueMap: Record<string, number> = {};
    const costMap: Record<string, number> = {};
    const productSales: Record<string, number> = {};

    filtered.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      revenueMap[dateKey] = (revenueMap[dateKey] || 0) + tx.total;
      
      tx.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
        const product = products.find(p => p.id === item.productId);
        const costPrice = product?.costPrice || 0;
        costMap[dateKey] = (costMap[dateKey] || 0) + (costPrice * item.quantity);
      });
    });

    let revenueByDay = [];

    if (!isFiltered) {
      revenueByDay = Array.from({ length: 30 }, (_, i) => {
        const d = subDays(new Date(), i);
        const dateStr = d.toISOString().split('T')[0];
        const revenue = Math.round(revenueMap[dateStr] || 0);
        const cost = Math.round(costMap[dateStr] || 0);
        return {
          name: format(d, 'd.M.', { locale: cs }),
          revenue: revenue,
          cost: cost,
          profit: Math.max(0, revenue - cost)
        };
      }).reverse();
    } else {
      const activeDates = Object.keys(revenueMap).sort();
      revenueByDay = activeDates.map(dateStr => {
        const revenue = Math.round(revenueMap[dateStr] || 0);
        const cost = Math.round(costMap[dateStr] || 0);
        return {
          name: format(new Date(dateStr), 'd.M.', { locale: cs }),
          revenue: revenue,
          cost: cost,
          profit: Math.max(0, revenue - cost)
        };
      });
    }

    const topProducts = Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { revenueByDay, topProducts };
  }, [isMounted, products, dateFrom, dateTo, selectedYear]);

  const handleAccordionChange = (value: string[]) => {
    setOpenAccordions(value);
    localStorage.setItem(SETTINGS_ACCORDION_STATE_KEY, JSON.stringify(value));
  };
  
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') toast({ title: "Úspěch", description: "Aplikace nainstalována." });
      setDeferredPrompt(null);
    }
  };

  const handleSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));
  };

  const handleSaveCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      toast({ variant: "destructive", title: "Chyba", description: "Kategorie již existuje." });
      return;
    }
    handleSaveCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName("");
    toast({ title: "Úspěch", description: "Kategorie přidána." });
  };

  const handleDeleteCategory = (cat: string) => {
    handleSaveCategories(categories.filter(c => c !== cat));
    toast({ title: "Úspěch", description: "Kategorie smazána." });
  };

  const handleAddProduct = (product: Omit<Product, "id">) => {
    const newProduct = { ...product, id: crypto.randomUUID(), enabled: true };
    handleSaveProducts([...products, newProduct]);
    toast({ title: "Úspěch", description: "Produkt přidán." });
    setIsSheetOpen(false);
  };

  const handleEditProduct = (product: Product) => {
    handleSaveProducts(products.map((p) => (p.id === product.id ? product : p)));
    toast({ title: "Úspěch", description: "Produkt aktualizován." });
    setIsSheetOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    if (productToDelete?.imageUrl?.startsWith('img_')) await deleteImage(productToDelete.imageUrl);
    handleSaveProducts(products.filter((p) => p.id !== productId));
    toast({ title: "Úspěch", description: "Produkt smazán." });
  };
  
  const handleSaveQrSettings = () => {
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(message));
    localStorage.setItem(BANKING_DETAILS_STORAGE_KEY, JSON.stringify(bankingDetails));
    toast({ title: "Úspěch", description: "Nastavení QR platby uloženo." });
  };

  const handleExportHistory = () => {
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];
    if (transactions.length === 0) return toast({ variant: "destructive", title: "Chyba", description: "Žádná historie k exportu." });
    const flattenedData = transactions.flatMap(tx => tx.items.map(item => ({
      'ID Transakce': tx.id,
      'Datum': new Date(tx.date).toLocaleString('cs-CZ'),
      'Celkem': tx.total,
      'Metoda': tx.paymentMethod === 'cash' ? 'Hotově' : 'QR',
      'Poznámka': tx.note || "",
      'Produkt': item.name,
      'Množství': item.quantity,
      'Cena': item.price
    })));
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transakce");
    XLSX.writeFile(workbook, "historie-transakci.xlsx");
  };

  const handleClearHistory = () => {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    toast({ title: "Úspěch", description: "Historie vymazána." });
  };
  
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);
        if (Array.isArray(importedData)) {
          const newProducts = importedData.map(p => ({
            id: p.id || crypto.randomUUID(),
            name: p.name,
            price: p.price,
            costPrice: p.costPrice || 0,
            category: p.category || "",
            imageUrl: p.imageUrl || "",
            enabled: p.enabled !== false,
            stock: p.stock ?? 0,
          }));
          handleSaveProducts(newProducts);
          toast({ title: "Úspěch", description: `Importováno ${newProducts.length} produktů.` });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Chyba importu" });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleRestoreDefaultProducts = async () => {
    const currentImageKeys = await getAllImageKeys();
    for (const key of currentImageKeys) await deleteImage(key);
    handleSaveProducts(DEFAULT_PRODUCTS);
    handleSaveCategories(DEFAULT_CATEGORIES);
    toast({ title: "Úspěch", description: "Výchozí stav obnoven." });
  };

  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedYear("all");
  };

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-2">
         <h1 className="text-3xl font-bold">Nastavení</h1>
         <p className="text-muted-foreground">Správa systému, vzhledu a dat.</p>
      </div>

      <Card className="mb-8 border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" /> Inventura a Ziskovost
          </CardTitle>
          <CardDescription>
            Podívejte se na podrobnou analýzu marží a hodnotu vašeho skladu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full sm:w-auto h-12 text-lg">
            <Link href="/inventory">Otevřít Inventuru</Link>
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <Accordion 
          type="multiple" 
          value={openAccordions}
          onValueChange={handleAccordionChange}
          className="w-full space-y-8"
        >
          <AccordionItem value="item-1" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                  <CardTitle>Vzhled & Instalace</CardTitle>
                  <CardDescription>PWA nastavení a motiv aplikace.</CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {showInstallPrompt && (
                  <Card className="bg-primary/10 border-primary relative mb-6">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setShowInstallPrompt(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <CardTitle>Instalace</CardTitle>
                      <CardDescription>Aplikace funguje 100% offline po instalaci.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={handleInstallClick} className="w-full" disabled={!deferredPrompt}>
                        <Smartphone className="mr-2 h-4 w-4" /> Instalovat (PWA)
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Motiv</Label>
                    <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4 mt-3">
                      {['light', 'dark', 'system'].map((t) => (
                        <div key={t}>
                          <RadioGroupItem value={t} id={t} className="peer sr-only" />
                          <Label htmlFor={t} className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary capitalize cursor-pointer">
                            {t === 'light' && <Sun className="h-6 w-6 mb-2" />}
                            {t === 'dark' && <Moon className="h-6 w-6 mb-2" />}
                            {t === 'system' && <Laptop className="h-6 w-6 mb-2" />}
                            {t === 'light' ? 'Světlý' : t === 'dark' ? 'Tmavý' : 'Systém'}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-base font-medium">Počet sloupců (mobil)</Label>
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
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="item-category" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                  <CardTitle>Správa kategorií</CardTitle>
                  <CardDescription>Definujte seznam kategorií pro vaše produkty.</CardDescription>
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
                  <Button onClick={handleAddCategory}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                      {cat}
                      <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => handleDeleteCategory(cat)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                  <CardTitle>Správa produktů</CardTitle>
                  <CardDescription>Upravujte sortiment a skladové zásoby.</CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="flex flex-wrap gap-2 mb-6">
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingProduct(null); setIsSheetOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Přidat produkt
                    </Button>
                  </DialogTrigger>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Importovat (.json)
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json" />
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Název</TableHead>
                        <TableHead>Kat.</TableHead>
                        <TableHead>Sklad</TableHead>
                        <TableHead className="text-right">Akce</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.category || "-"}</TableCell>
                          <TableCell>{p.stock} ks</TableCell>
                          <TableCell className="text-right space-x-1">
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(p); setIsSheetOpen(true); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Smazat produkt?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(p.id)}>Smazat</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="item-5" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                  <CardTitle>Analýza prodejů</CardTitle>
                  <CardDescription>Vizualizace vašich lokálních dat s pokročilými filtry.</CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="flex flex-col gap-8">
                  <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-4 rounded-xl border">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtry</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-[120px] h-8 text-xs justify-start font-normal", !dateFrom && "text-muted-foreground")}>
                            {dateFrom ? format(dateFrom, "d. M.") : "Od"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus locale={cs} />
                        </PopoverContent>
                      </Popover>
                      <span className="text-muted-foreground">-</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-[120px] h-8 text-xs justify-start font-normal", !dateTo && "text-muted-foreground")}>
                            {dateTo ? format(dateTo, "d. M.") : "Do"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus locale={cs} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="w-[100px]">
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Rok" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Vše</SelectItem>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(dateFrom || dateTo || selectedYear !== "all") && (
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                        <FilterX className="h-3 w-3 mr-1.5" /> Reset
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/20 p-2 rounded-lg border border-dashed">
                    <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as any)} className="w-auto">
                      <TabsList className="h-8">
                        <TabsTrigger value="stacked" className="text-xs py-1 px-3">
                          <Rows className="h-3 w-3 mr-1.5" /> Skládaný
                        </TabsTrigger>
                        <TabsTrigger value="grouped" className="text-xs py-1 px-3">
                          <LayoutGrid className="h-3 w-3 mr-1.5" /> Vedle sebe
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    <div className="flex items-center gap-4 px-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="s-show-cost" checked={showCost} onCheckedChange={setShowCost} className="scale-75" />
                        <Label htmlFor="s-show-cost" className="text-xs cursor-pointer flex items-center gap-1.5">
                          {showCost ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} Nákup
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="s-show-profit" checked={showProfit} onCheckedChange={setShowProfit} className="scale-75" />
                        <Label htmlFor="s-show-profit" className="text-xs cursor-pointer flex items-center gap-1.5">
                          {showProfit ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} Zisk
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4 text-primary" /> Vývoj tržeb a zisku
                      </h4>
                      <div className="h-[400px] w-full bg-muted/10 p-4 rounded-xl border">
                        {analyticsData.revenueByDay.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.revenueByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} Kč`} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <RechartsTooltip 
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                              />
                              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                              {showCost && (
                                <Bar 
                                  dataKey="cost" 
                                  name="Nákup" 
                                  stackId={chartMode === 'stacked' ? 'a' : undefined} 
                                  fill="#94a3b8" 
                                  radius={chartMode === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                                />
                              )}
                              {showProfit && (
                                <Bar 
                                  dataKey="profit" 
                                  name="Zisk" 
                                  stackId={chartMode === 'stacked' ? 'a' : undefined} 
                                  fill="#10b981" 
                                  radius={[4, 4, 0, 0]} 
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                            Pro vybrané filtry neexistují žádná data.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                        <PieChartIcon className="h-4 w-4 text-primary" /> TOP Produkty
                      </h4>
                      <div className="flex flex-col md:flex-row items-center gap-8 bg-muted/10 p-6 rounded-xl border">
                        <div className="h-[250px] w-full md:w-1/2">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={analyticsData.topProducts} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={90} 
                                paddingAngle={5} 
                                dataKey="value"
                              >
                                {analyticsData.topProducts.map((_, i) => (
                                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 grid grid-cols-2 gap-x-4 gap-y-2">
                          {analyticsData.topProducts.map((e, i) => (
                            <div key={e.name} className="flex items-center gap-2 text-xs">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="truncate">{e.name}: <strong>{e.value} ks</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="item-3" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                  <CardTitle>QR Platba</CardTitle>
                  <CardDescription>Bankovní údaje pro generování QR kódů.</CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 space-y-4">
                <div className="space-y-2">
                  <Label>Jméno příjemce</Label>
                  <Input value={bankingDetails.recipientName} onChange={(e) => setBankingDetails({ ...bankingDetails, recipientName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Číslo účtu / IBAN</Label>
                  <Input value={bankingDetails.accountNumber} onChange={(e) => setBankingDetails({ ...bankingDetails, accountNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Zpráva pro příjemce</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
                </div>
                <Button onClick={handleSaveQrSettings} className="w-full">Uložit nastavení</Button>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="item-4" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0 text-left">
                  <CardTitle>Údržba dat</CardTitle>
                  <CardDescription>Exporty, importy a resety databáze.</CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" onClick={handleExportHistory}><Download className="mr-2 h-4 w-4" /> Export historie (Excel)</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive"><Trash className="mr-2 h-4 w-4" /> Reset historie</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Smazat celou historii?</AlertDialogTitle><AlertDialogDescription>Tato akce je nevratná a smaže všechny záznamy o prodejích.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory}>Smazat vše</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline"><RefreshCcw className="mr-2 h-4 w-4" /> Výchozí stav</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Obnovit výchozí produkty?</AlertDialogTitle><AlertDialogDescription>Smaže vaše stávající produkty a nahradí je ukázkovými daty.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestoreDefaultProducts}>Obnovit</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
        
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingProduct ? 'Upravit produkt' : 'Přidat nový produkt'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] -mx-6 px-6">
            <ProductForm 
              onSubmit={editingProduct ? handleEditProduct : handleAddProduct} 
              product={editingProduct} 
              categories={categories}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
