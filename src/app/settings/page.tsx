
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
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import ProductForm from "@/components/product-form";
import { Plus, Edit, Trash2, Loader2, Sun, Moon, Laptop, Upload, Download, Trash, RefreshCcw, Smartphone, Info, X } from "lucide-react";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

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
    }
  }, [isMounted]);

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

  const handleDeleteProduct = (productId: string) => {
    handleSaveProducts(products.filter((p) => p.id !== productId));
    toast({ title: "Úspěch", description: "Produkt smazán." });
  };
  
  const handleSaveMessage = () => {
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(message));
    toast({ title: "Úspěch", description: "Zpráva uložena." });
  };

  const handleSaveBankingDetails = () => {
    localStorage.setItem(BANKING_DETAILS_STORAGE_KEY, JSON.stringify(bankingDetails));
    toast({ title: "Úspěch", description: "Bankovní údaje uloženy." });
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
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("Nelze přečíst soubor");
        const importedData = JSON.parse(text);
        if (Array.isArray(importedData)) {
          const validProducts: Product[] = importedData
            .filter(p => p.name && typeof p.price === 'number')
            .map(p => ({
              id: p.id || crypto.randomUUID(),
              name: p.name,
              price: p.price,
              imageUrl: p.imageUrl || "",
              enabled: p.enabled !== false,
            }));
          handleSaveProducts(validProducts);
          toast({ title: "Úspěch", description: `Importováno ${validProducts.length} produktů.` });
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
  
  const handleExportProducts = () => {
    if (products.length === 0) {
      toast({ variant: "destructive", title: "Chyba", description: "Žádné produkty k exportu." });
      return;
    }
    const exportableProducts = products.map(({ name, price, imageUrl, enabled }) => ({ name, price, imageUrl, enabled }));
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
  
  const handleRestoreDefaultProducts = () => {
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
      <div className="space-y-8">
        {showInstallPrompt && (
          <Card className="bg-primary/10 border-primary relative">
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
        <Card>
          <CardHeader>
            <CardTitle>Vzhled</CardTitle>
            <CardDescription>
              Vyberte si světlý nebo tmavý režim.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Sun className="h-6 w-6 mb-2" />
                  Světlý
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Moon className="h-6 w-6 mb-2" />
                  Tmavý
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Laptop className="h-6 w-6 mb-2" />
                  Systém
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Spravovat produkty</CardTitle>
            <CardDescription>
              Zde můžete přidávat, upravovat, mazat, importovat a exportovat své produkty.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        <Image 
                          src={product.imageUrl || "https://placehold.co/100x100.png"}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover"
                          data-ai-hint="product image"
                        />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bankovní spojení</CardTitle>
            <CardDescription>
              Zadejte své bankovní údaje pro platby. Tyto informace budou zakódovány v QR kódu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button onClick={handleSaveBankingDetails}>Uložit bankovní údaje</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zpráva pro platbu</CardTitle>
            <CardDescription>
              Nastavte předdefinovanou zprávu, která bude součástí QR kódu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="např. Děkujeme za Váš nákup!"
              rows={3}
            />
            <Button onClick={handleSaveMessage}>Uložit zprávu</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Správa Dat</CardTitle>
            <CardDescription>
              Exportujte historii transakcí nebo spravujte data aplikace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
