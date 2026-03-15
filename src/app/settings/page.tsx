"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
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
import { Switch } from "@/components/ui/switch";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Plus, Edit, Trash2, Loader2, Sun, Moon, Laptop, Upload, Download, Trash, RefreshCcw, Smartphone, Info, X, LayoutGrid, Rows, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { getImage, saveImage, deleteImage, getAllImageKeys } from "@/lib/db";
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
} from "recharts";
import { format, subDays } from "date-fns";
import { cs } from "date-fns/locale";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const ProductImage = ({ product }: { product: Product }) => {
  const [imageUrl, setImageUrl] = useState("https://placehold.co/100x100.png");

  useEffect(() => {
    const loadImage = async () => {
      if (product.imageUrl?.startsWith('img_')) {
        const storedImage = await getImage(product.imageUrl);
        setImageUrl(storedImage || "https://placehold.co/100x100.png");
      } else if (product.imageUrl) {
        setImageUrl(product.imageUrl);
      } else {
        setImageUrl("https://placehold.co/100x100.png");
      }
    };
    loadImage();
  }, [product.imageUrl]);

  return (
    <Image 
      src={imageUrl}
      alt={product.name}
      width={40}
      height={40}
      className="rounded-md object-cover"
      data-ai-hint="product image"
    />
  );
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316'];

export default function SettingsPage() {
  const isMounted = useIsMounted();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { columnView, setColumnView } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<string[]>(['item-1', 'item-2', 'item-5']);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      setProducts(storedProducts ? JSON.parse(storedProducts) : DEFAULT_PRODUCTS);
      
      const storedMessage = localStorage.getItem(MESSAGE_STORAGE_KEY);
      setMessage(storedMessage ? JSON.parse(storedMessage) : DEFAULT_MESSAGE);

      const storedBankingDetails = localStorage.getItem(BANKING_DETAILS_STORAGE_KEY);
      setBankingDetails(storedBankingDetails ? JSON.parse(storedBankingDetails) : DEFAULT_BANKING_DETAILS);
    
      const storedAccordionState = localStorage.getItem(SETTINGS_ACCORDION_STATE_KEY);
      if (storedAccordionState) {
          setOpenAccordions(JSON.parse(storedAccordionState));
      }
    }
  }, [isMounted]);

  const analyticsData = useMemo(() => {
    if (!isMounted) return { revenueByDay: [], topProducts: [] };
    
    const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];
    
    // Revenue by day (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueByDay = last30Days.map(dateStr => {
      const dayTotal = transactions
        .filter(tx => tx.date.startsWith(dateStr))
        .reduce((acc, tx) => acc + tx.total, 0);
      return { 
        name: format(new Date(dateStr), 'd.M.', { locale: cs }), 
        value: dayTotal 
      };
    });

    // Top 8 products
    const productSales: Record<string, number> = {};
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { revenueByDay, topProducts };
  }, [isMounted]);

  const handleAccordionChange = (value: string[]) => {
    setOpenAccordions(value);
    localStorage.setItem(SETTINGS_ACCORDION_STATE_KEY, JSON.stringify(value));
  };
  
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: "Úspěch", description: "Aplikace byla úspěšně nainstalována." });
      } else {
        toast({ title: "Instalace zrušena", description: "Instalaci můžete provést později." });
      }
      setDeferredPrompt(null);
    }
  };

  const handleSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));
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
    if (productToDelete?.imageUrl?.startsWith('img_')) {
      await deleteImage(productToDelete.imageUrl);
    }
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

    if (transactions.length === 0) {
      toast({ variant: "destructive", title: "Chyba", description: "Žádná historie transakcí k exportu." });
      return;
    }

    const flattenedData = transactions.flatMap(tx =>
      tx.items.map(item => ({
        'ID Transakce': tx.id,
        'Datum': new Date(tx.date).toLocaleString('cs-CZ'),
        'Celkem': tx.total,
        'Platební metoda': tx.paymentMethod === 'cash' ? 'Hotově' : 'QR Platba',
        'ID Produktu': item.productId,
        'Název Produktu': item.name,
        'Množství': item.quantity,
        'Cena za kus': item.price,
        'Mezisoučet': item.price * item.quantity
      }))
    );
    
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transakce");
    XLSX.writeFile(workbook, "historie-transakci.xlsx");
    toast({ title: "Úspěch", description: "Historie transakcí exportována." });
  };

  const handleClearHistory = () => {
    localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    toast({ title: "Úspěch", description: "Historie transakcí byla vymazána." });
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Nelze přečíst soubor");
        const importedData = JSON.parse(text);

        if (Array.isArray(importedData)) {
          const newProducts: Product[] = [];
          for (const p of importedData) {
            if (p.name && typeof p.price === 'number') {
              let imageUrl = p.imageUrl || "";
              if (imageUrl.startsWith('data:')) {
                  const imageKey = `img_${crypto.randomUUID()}`;
                  await saveImage(imageKey, imageUrl);
                  imageUrl = imageKey;
              }
              newProducts.push({
                id: p.id || crypto.randomUUID(),
                name: p.name,
                price: p.price,
                category: p.category || "",
                imageUrl: imageUrl,
                enabled: p.enabled !== false,
                stock: p.stock ?? 0,
              });
            }
          }
          handleSaveProducts(newProducts);
          toast({ title: "Úspěch", description: `Importováno ${newProducts.length} produktů.` });
        } else {
          throw new Error("Neplatný formát souboru.");
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Chyba importu", description: "Soubor je poškozený nebo má nesprávný formát." });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleExportProducts = async () => {
    if (products.length === 0) {
      toast({ variant: "destructive", title: "Chyba", description: "Žádné produkty k exportu." });
      return;
    }
    const exportableProducts = await Promise.all(
        products.map(async ({ name, price, imageUrl, enabled, stock, category }) => {
            let finalImageUrl = imageUrl || "";
            if (imageUrl?.startsWith('img_')) {
                finalImageUrl = await getImage(imageUrl) || "";
            }
            return { name, price, imageUrl: finalImageUrl, enabled, stock, category };
        })
    );
    const data = JSON.stringify(exportableProducts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produkty.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Úspěch", description: "Produkty exportovány." });
  };
  
  const handleRestoreDefaultProducts = async () => {
    const currentImageKeys = await getAllImageKeys();
    for (const key of currentImageKeys) {
        await deleteImage(key);
    }
    handleSaveProducts(DEFAULT_PRODUCTS);
    toast({ title: "Úspěch", description: "Výchozí produkty byly obnoveny." });
  };
  
  const handleToggleProductEnabled = (productId: string) => {
    const newProducts = products.map(p => 
      p.id === productId ? { ...p, enabled: !(p.enabled ?? true) } : p
    );
    handleSaveProducts(newProducts);
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
                <CardHeader className="p-0">
                  <CardTitle>Vzhled & Instalace</CardTitle>
                  <CardDescription>
                    Nainstalujte si aplikaci a přizpůsobte si její vzhled.
                  </CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {showInstallPrompt && (
                    <Card className="bg-primary/10 border-primary relative mb-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setShowInstallPrompt(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <CardTitle>Instalace aplikace</CardTitle>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-bold mb-2">Instalace na iOS:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                  <li>V Safari klepněte na 'Sdílet'.</li>
                                  <li>Vyberte 'Přidat na plochu'.</li>
                                </ol>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <CardDescription>
                          Aplikace funguje 100% offline po instalaci na plochu.
                        </CardDescription>
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
                      <Label className="text-base font-medium">Motiv aplikace</Label>
                      <RadioGroup
                        value={theme}
                        onValueChange={setTheme}
                        className="grid grid-cols-3 gap-4 mt-3"
                      >
                        {['light', 'dark', 'system'].map((t) => (
                          <div key={t}>
                            <RadioGroupItem value={t} id={t} className="peer sr-only" />
                            <Label
                              htmlFor={t}
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary capitalize cursor-pointer"
                            >
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
                      <Label className="text-base font-medium">Počet sloupců na mobilu</Label>
                      <RadioGroup
                        value={columnView}
                        onValueChange={(value) => setColumnView(value as '2-col' | '3-col')}
                        className="grid grid-cols-2 gap-4 mt-3"
                      >
                        <div>
                          <RadioGroupItem value="2-col" id="2-col" className="peer sr-only" />
                          <Label
                            htmlFor="2-col"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Rows className="h-6 w-6 mb-2" />
                            2 Sloupce
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="3-col" id="3-col" className="peer sr-only" />
                          <Label
                            htmlFor="3-col"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <LayoutGrid className="h-6 w-6 mb-2" />
                            3 Sloupce
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="item-2" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0">
                  <CardTitle>Správa produktů</CardTitle>
                  <CardDescription>
                    Upravujte sortiment, skladové zásoby a kategorie.
                  </CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="flex flex-wrap gap-2 mb-6">
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingProduct(null); setIsSheetOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Přidat produkt
                    </Button>
                  </DialogTrigger>
                  <Button variant="outline" onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" /> Importovat
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json" />
                  <Button variant="outline" onClick={handleExportProducts}>
                    <Download className="mr-2 h-4 w-4" /> Exportovat
                  </Button>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Foto</TableHead>
                        <TableHead>Název</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead>Cena</TableHead>
                        <TableHead>Sklad</TableHead>
                        <TableHead className="text-right">Akce</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <ProductImage product={product} />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground">{product.category || "-"}</TableCell>
                          <TableCell>{product.price.toFixed(0)} Kč</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsSheetOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Smazat produkt?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tato akce trvale odstraní produkt ze systému.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>Smazat</AlertDialogAction>
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
                <CardHeader className="p-0">
                  <CardTitle>Analýza prodejů</CardTitle>
                  <CardDescription>
                    Lokální statistiky tržeb a oblíbených položek.
                  </CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="flex flex-col gap-12">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Tržby za posledních 30 dní
                    </h4>
                    <div className="h-[300px] w-full bg-muted/20 p-4 rounded-xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.revenueByDay}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888844" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            interval={4}
                          />
                          <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value} Kč`}
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            itemStyle={{ color: 'hsl(var(--primary))' }}
                            formatter={(value) => [`${value} Kč`, 'Tržba']}
                          />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-primary" /> Nejoblíbenější produkty (TOP 8)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 bg-muted/20 p-6 rounded-xl">
                      <div className="h-[250px]">
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
                              {analyticsData.topProducts.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                              formatter={(value) => [`${value} ks`, 'Prodaných']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col gap-2">
                        {analyticsData.topProducts.map((entry, index) => (
                          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="truncate max-w-[150px]">{entry.name}</span>
                            </div>
                            <span className="font-bold">{entry.value} ks</span>
                          </div>
                        ))}
                        {analyticsData.topProducts.length === 0 && (
                          <p className="text-muted-foreground text-center italic">Zatím žádné prodeje</p>
                        )}
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
                <CardHeader className="p-0">
                  <CardTitle>QR Platba</CardTitle>
                  <CardDescription>
                    Nastavení bankovních údajů pro generování QR kódů.
                  </CardDescription>
                </AccordionTrigger>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Jméno příjemce</Label>
                    <Input
                      id="recipientName"
                      value={bankingDetails.recipientName}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, recipientName: e.target.value })}
                      placeholder="např. Jan Novák"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">IBAN (pro QR platbu)</Label>
                    <Input
                      id="accountNumber"
                      value={bankingDetails.accountNumber}
                      onChange={(e) => setBankingDetails({ ...bankingDetails, accountNumber: e.target.value })}
                      placeholder="CZ6508000000001234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMessage">Zpráva pro platbu</Label>
                    <Textarea
                      id="paymentMessage"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Děkujeme za nákup!"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSaveQrSettings} className="w-full">Uložit nastavení QR</Button>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="item-4" className="border-none">
            <Card>
              <AccordionTrigger className="p-6">
                <CardHeader className="p-0">
                  <CardTitle>Údržba dat</CardTitle>
                  <CardDescription>
                    Export historie a resetování aplikace.
                  </CardDescription>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button variant="outline" onClick={handleExportHistory}>
                    <Download className="mr-2 h-4 w-4" /> Export historie (Excel)
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash className="mr-2 h-4 w-4" /> Vymazat historii
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Smazat celou historii?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tuto akci nelze vrátit. Dojde k trvalému odstranění všech transakcí.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zrušit</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory}>Vymazat</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" onClick={() => setShowInstallPrompt(true)}>
                    Instalační dialog
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Výchozí produkty
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Obnovit výchozí?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Váš současný seznam bude nahrazen ukázkovými produkty.
                        </AlertDialogDescription>
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
        <DialogContent className="max-h-[90vh] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Upravit produkt' : 'Nový produkt'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] -mx-6 px-6">
            <ProductForm
              onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
              product={editingProduct}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
