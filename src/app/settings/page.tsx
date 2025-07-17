
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import type { Product, BankingDetails } from "@/lib/types";
import {
  DEFAULT_PRODUCTS,
  PRODUCTS_STORAGE_KEY,
  MESSAGE_STORAGE_KEY,
  DEFAULT_MESSAGE,
  BANKING_DETAILS_STORAGE_KEY,
  DEFAULT_BANKING_DETAILS,
} from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import ProductForm from "@/components/product-form";
import { Plus, Edit, Trash2, Loader2, Sun, Moon, Laptop } from "lucide-react";

export default function SettingsPage() {
  const isMounted = useIsMounted();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const handleSaveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));
  };

  const handleAddProduct = (product: Omit<Product, "id">) => {
    const newProduct = { ...product, id: crypto.randomUUID() };
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Spravovat produkty</CardTitle>
              <CardDescription>
                Zde můžete přidávat, upravovat nebo mazat své produkty.
              </CardDescription>
            </div>
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
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Obrázek</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead>Cena</TableHead>
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
                      <TableCell>{product.price.toFixed(2)} Kč</TableCell>
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
                placeholder="např. Jan Novák"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Číslo účtu</Label>
              <Input
                id="accountNumber"
                value={bankingDetails.accountNumber}
                onChange={(e) => setBankingDetails({ ...bankingDetails, accountNumber: e.target.value })}
                placeholder="např. 1234567890"
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
      </div>
    </div>
  );
}
