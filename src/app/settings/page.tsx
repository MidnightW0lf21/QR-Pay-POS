
"use client";

import { useState, useEffect, useRef } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Plus, Edit, Trash2, Loader2, Sun, Moon, Laptop, Upload, Download, Trash, RefreshCcw, Smartphone, Info, X, LayoutGrid, Rows } from "lucide-react";
import { getImage, saveImage, deleteImage, getAllImageKeys } from "@/lib/db";

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
  const [openAccordions, setOpenAccordions] = useState<string[]>(['item-1', 'item-2']);

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
                imageUrl: imageUrl,
                enabled: p.enabled !== false,
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
    event.target.value = ''; // Reset input
  };
  
  const handleExportProducts = async () => {
    if (products.length === 0) {
      toast({ variant: "destructive", title: "Chyba", description: "Žádné produkty k exportu." });
      return;
    }
    const exportableProducts = await Promise.all(
        products.map(async ({ name, price, imageUrl, enabled }) => {
            let finalImageUrl = imageUrl || "";
            if (imageUrl?.startsWith('img_')) {
                finalImageUrl = await getImage(imageUrl) || "";
            }
            return { name, price, imageUrl: finalImageUrl, enabled };
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
                <CardTitle>Instalace &amp; Vzhled</CardTitle>
                <CardDescription>
                  Nainstalujte si aplikaci, vyberte si světlý nebo tmavý režim a nastavte zobrazení.
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
                      <span className="sr-only">Zavřít</span>
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
                              <p className="font-bold mb-2">Jak nainstalovat na iOS:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                <li>Otevřete tuto stránku v Safari.</li>
                                <li>Klepněte na ikonu 'Sdílet'.</li>
                                <li>Sjeďte dolů a vyberte 'Přidat na plochu'.</li>
                              </ol>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <CardDescription>
                        Nainstalujte si tuto aplikaci na své zařízení pro rychlý přístup a offline použití.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={handleInstallClick} className="w-full" disabled={!deferredPrompt}>
                        <Smartphone className="mr-2 h-4 w-4" /> Instalovat aplikaci (Android)
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Motiv</Label>
                    <RadioGroup
                      value={theme}
                      onValueChange={setTheme}
                      className="grid grid-cols-3 gap-4 mt-2"
                    >
                      <div>
                        <RadioGroupItem value="light" id="light" className="peer sr-only" />
                        <Label
                          htmlFor="light"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&amp;:has([data-state=checked])]:border-primary"
                        >
                          <Sun className="h-6 w-6 mb-2" />
                          Světlý
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                        <Label
                          htmlFor="dark"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&amp;:has([data-state=checked])]:border-primary"
                        >
                          <Moon className="h-6 w-6 mb-2" />
                          Tmavý
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="system" id="system" className="peer sr-only" />
                        <Label
                          htmlFor="system"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&amp;:has([data-state=checked])]:border-primary"
                        >
                          <Laptop className="h-6 w-6 mb-2" />
                          Systém
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-base font-medium">Zobrazení na mobilu</Label>
                     <RadioGroup
                      value={columnView}
                      onValueChange={(value) => setColumnView(value as '2-col' | '3-col')}
                      className="grid grid-cols-2 gap-4 mt-2"
                    >
                      <div>
                        <RadioGroupItem value="2-col" id="2-col" className="peer sr-only" />
                        <Label
                          htmlFor="2-col"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&amp;:has([data-state=checked])]:border-primary"
                        >
                          <Rows className="h-6 w-6 mb-2" />
                          2 Sloupce
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="3-col" id="3-col" className="peer sr-only" />
                        <Label
                          htmlFor="3-col"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&amp;:has([data-state=checked])]:border-primary"
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
                <CardTitle>Spravovat produkty</CardTitle>
                <CardDescription>
                  Přidávejte, upravujte, mažte, importujte a exportujte své produkty.
                </CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button onClick={() => { setEditingProduct(null); setIsSheetOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" /> Přidat produkt
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>{editingProduct ? 'Upravit produkt' : 'Přidat nový produkt'}</SheetTitle>
                    </SheetHeader>
                    <ProductForm
                      onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
                      product={editingProduct}
                    />
                  </SheetContent>
                </Sheet>
                <Button variant="outline" onClick={handleImportClick}>
                  <Upload className="mr-2 h-4 w-4" /> Importovat (JSON)
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json" />
                <Button variant="outline" onClick={handleExportProducts}>
                  <Download className="mr-2 h-4 w-4" /> Exportovat (JSON)
                </Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Obrázek</TableHead>
                      <TableHead>Název</TableHead>
                      <TableHead>Cena</TableHead>
                      <TableHead>Povoleno</TableHead>
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
                        <TableCell>{product.price.toFixed(0)} Kč</TableCell>
                        <TableCell>
                          <Switch
                            checked={product.enabled !== false}
                            onCheckedChange={() => handleToggleProductEnabled(product.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Jste si jistí?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tuto akci nelze vrátit zpět. Tímto trvale smažete produkt.
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
        
        <AccordionItem value="item-3" className="border-none">
          <Card>
            <AccordionTrigger className="p-6">
              <CardHeader className="p-0">
                <CardTitle>QR Platba</CardTitle>
                <CardDescription>
                  Spravujte bankovní údaje a zprávu pro QR platby.
                </CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Jméno příjemce</Label>
                  <Input
                    id="recipientName"
                    value={bankingDetails.recipientName}
                    onChange={(e) => setBankingDetails({ ...bankingDetails, recipientName: e.target.value })}
                    placeholder="napr. Jan Novak"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Číslo účtu (IBAN)</Label>
                  <Input
                    id="accountNumber"
                    value={bankingDetails.accountNumber}
                    onChange={(e) => setBankingDetails({ ...bankingDetails, accountNumber: e.target.value })}
                    placeholder="např. CZ6508000000001234567890"
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="paymentMessage">Zpráva pro platbu</Label>
                  <Textarea
                    id="paymentMessage"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="např. Děkujeme za Váš nákup!"
                    rows={3}
                  />
                </div>
                <Button onClick={handleSaveQrSettings}>Uložit nastavení QR</Button>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
        
        <AccordionItem value="item-4" className="border-none">
          <Card>
            <AccordionTrigger className="p-6">
              <CardHeader className="p-0">
                <CardTitle>Správa Dat</CardTitle>
                <CardDescription>
                  Exportujte historii, mažte data a obnovujte nastavení.
                </CardDescription>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" onClick={handleExportHistory}>
                  <Download className="mr-2 h-4 w-4" /> Exportovat historii (Excel)
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash className="mr-2 h-4 w-4" /> Vymazat historii transakcí
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Jste si absolutně jistí?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tato akce je nevratná a trvale smaže veškerou vaši historii transakcí.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory}>
                        Ano, smazat historii
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" onClick={() => setShowInstallPrompt(true)}>
                  Zobrazit instalační dialog
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <RefreshCcw className="mr-2 h-4 w-4" /> Obnovit výchozí produkty
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Obnovit výchozí produkty?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tímto nahradíte váš současný seznam produktů výchozí sadou. Vaše vlastní produkty budou smazány.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestoreDefaultProducts}>
                        Ano, obnovit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
