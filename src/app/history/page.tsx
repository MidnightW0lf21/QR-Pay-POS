
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Wallet,
  QrCode,
  Trash,
  Calendar as CalendarIcon,
  FilterX,
  Boxes,
  Receipt,
  TrendingUp,
} from "lucide-react";
import type { Transaction, PaymentMethod, Product } from "@/lib/types";
import { TRANSACTIONS_STORAGE_KEY, PRODUCTS_STORAGE_KEY } from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function HistoryPage() {
  const isMounted = useIsMounted();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMethod>(
    "all"
  );
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [productFilter, setProductFilter] = useState<"all" | string>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (isMounted) {
      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
    }
  }, [isMounted]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (paymentFilter !== "all") {
      filtered = filtered.filter((tx) => tx.paymentMethod === paymentFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter(
        (tx) => new Date(tx.date).toDateString() === dateFilter.toDateString()
      );
    }
    if (productFilter !== "all") {
      filtered = filtered.filter((tx) =>
        tx.items.some((item) => item.productId === productFilter)
      );
    }
    return filtered;
  }, [transactions, paymentFilter, dateFilter, productFilter]);

  const stats = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        acc.totalRevenue += tx.total;

        let itemsToSum = tx.items;
        // If a product filter is active, only sum quantities of that specific product
        if (productFilter !== "all") {
          itemsToSum = tx.items.filter(
            (item) => item.productId === productFilter
          );
        }

        acc.totalItemsSold += itemsToSum.reduce(
          (itemAcc, item) => itemAcc + item.quantity,
          0
        );
        return acc;
      },
      { totalRevenue: 0, totalItemsSold: 0 }
    );
  }, [filteredTransactions, productFilter]);

  const dailyIncome = useMemo(() => {
    const targetDate = dateFilter || new Date();
    const dailyTransactions = transactions.filter(tx => 
      new Date(tx.date).toDateString() === targetDate.toDateString()
    );
    return dailyTransactions.reduce((acc, tx) => acc + tx.total, 0);
  }, [transactions, dateFilter]);

  const handleDeleteLastTransaction = () => {
    const newTransactions = [...transactions];
    newTransactions.shift(); // Remove the first (most recent) transaction
    setTransactions(newTransactions);
    localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(newTransactions)
    );
    toast({
      title: "Úspěch",
      description: "Poslední transakce byla smazána.",
      variant: "success",
      duration: 2000,
    });
  };

  const handleBatchDelete = () => {
    const newTransactions = transactions.filter(
      (tx) => !selectedTransactions.has(tx.id)
    );
    setTransactions(newTransactions);
    localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(newTransactions)
    );
    setSelectedTransactions(new Set());
    toast({
      title: "Úspěch",
      description: `${selectedTransactions.size} transakce byly smazány.`,
      variant: "success",
    });
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map((tx) => tx.id)));
    }
  };

  const toggleTransactionSelection = (id: string) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTransactions(newSelection);
  };

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const getPaymentMethodInfo = (method: Transaction["paymentMethod"]) => {
    if (method === "cash") {
      return {
        text: "Hotově",
        icon: <Wallet className="h-4 w-4 mr-2" />,
        variant: "secondary" as const,
      };
    }
    return {
      text: "QR Platba",
      icon: <QrCode className="h-4 w-4 mr-2" />,
      variant: "default" as const,
    };
  };

  const clearFilters = () => {
    setPaymentFilter("all");
    setDateFilter(undefined);
    setProductFilter("all");
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Historie transakcí</CardTitle>
              <CardDescription>
                Zde je seznam vašich nedávných transakcí.
              </CardDescription>
            </div>
            {selectedTransactions.size > 0 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Smazat vybrané ({selectedTransactions.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Opravdu smazat vybrané transakce?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tato akce je nevratná. Dojde k trvalému odstranění
                      vybraných transakcí.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBatchDelete}>
                      Ano, smazat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              transactions.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash className="mr-2 h-4 w-4" />
                      Smazat poslední
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Opravdu smazat poslední transakci?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tato akce je nevratná. Dojde k trvalému odstranění
                        poslední zaznamenané transakce.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteLastTransaction}>
                        Ano, smazat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <Label>Platba</Label>
                <RadioGroup
                  value={paymentFilter}
                  onValueChange={(v) =>
                    setPaymentFilter(v as "all" | PaymentMethod)
                  }
                  className="flex items-center space-x-2 mt-1"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="all" id="r-all" />
                    <Label htmlFor="r-all">Vše</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="cash" id="r-cash" />
                    <Label htmlFor="r-cash">Hotově</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="qr" id="r-qr" />
                    <Label htmlFor="r-qr">QR</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !dateFilter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter ? (
                        format(dateFilter, "PPP", { locale: cs })
                      ) : (
                        <span>Vyberte datum</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      initialFocus
                      locale={cs}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="product-filter">Produkt</Label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger id="product-filter" className="mt-1">
                    <SelectValue placeholder="Vyberte produkt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny produkty</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="self-end">
                <Button onClick={clearFilters} variant="ghost" className="w-full">
                  <FilterX className="mr-2 h-4 w-4" />
                  Zrušit filtry
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 text-center">
                    <p className="text-sm text-primary/80 flex items-center justify-center gap-1.5">
                      <TrendingUp className="h-4 w-4"/>
                      Denní příjem
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {dailyIncome.toFixed(0)} Kč
                    </p>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="grid grid-cols-3 gap-4 p-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Příjem (filtr)
                    </p>
                    <p className="text-xl font-bold">
                      {stats.totalRevenue.toFixed(0)} Kč
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transakcí</p>
                    <p className="text-xl font-bold flex items-center justify-center gap-1">
                      <Receipt className="h-4 w-4" />{" "}
                      {filteredTransactions.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prodáno</p>
                    <p className="text-xl font-bold flex items-center justify-center gap-1">
                      <Boxes className="h-4 w-4" /> {stats.totalItemsSold}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {transactions.length === 0 ? (
            <p className="text-muted-foreground">
              Nebyly nalezeny žádné transakce.
            </p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Pro vybrané filtry nebyly nalezeny žádné transakce.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              <div className="flex items-center px-4 py-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={
                    selectedTransactions.size === filteredTransactions.length &&
                    filteredTransactions.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Vybrat vše"
                />
                <Label
                  htmlFor="select-all"
                  className="ml-3 text-sm font-medium"
                >
                  Vybrat vše na této stránce
                </Label>
              </div>
              {filteredTransactions.map((transaction) => {
                const paymentInfo = getPaymentMethodInfo(
                  transaction.paymentMethod
                );
                return (
                  <AccordionItem value={transaction.id} key={transaction.id}>
                    <div className="flex items-center w-full">
                      <div className="px-4 py-2 flex items-center">
                        <Checkbox
                          checked={selectedTransactions.has(transaction.id)}
                          onCheckedChange={() =>
                            toggleTransactionSelection(transaction.id)
                          }
                          aria-label={`Vybrat transakci ${transaction.id}`}
                        />
                      </div>
                      <AccordionTrigger className="flex-1">
                        <div className="flex justify-between items-center w-full pr-4">
                          <div className="flex flex-col items-start">
                            <span className="text-sm">
                              {new Date(transaction.date).toLocaleString(
                                "cs-CZ"
                              )}
                            </span>
                            <Badge
                              variant={paymentInfo.variant}
                              className="mt-1"
                            >
                              {paymentInfo.icon}
                              {paymentInfo.text}
                            </Badge>
                          </div>
                          <span className="font-bold text-primary text-lg">
                            {transaction.total.toFixed(0)} Kč
                          </span>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="pl-12">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produkt</TableHead>
                            <TableHead className="text-center">
                              Množství
                            </TableHead>
                            <TableHead className="text-right">Cena</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transaction.items.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-center">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                {(item.price * item.quantity).toFixed(0)} Kč
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
