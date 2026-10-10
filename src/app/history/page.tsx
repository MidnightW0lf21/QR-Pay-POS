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
  MonitorSmartphone,
  Tag
} from "lucide-react";
import type { Transaction, PaymentMethod, Product } from "@/lib/types";
import { TRANSACTIONS_STORAGE_KEY, PRODUCTS_STORAGE_KEY } from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { useDataContext } from "@/context/DataContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function HistoryPage() {
  const isMounted = useIsMounted();
  const { 
    transactions, 
    products, 
    deleteLastTransaction, 
    deleteBatchTransactions 
  } = useDataContext();
  const { toast } = useToast();

  const currentYearStr = useMemo(() => new Date().getFullYear().toString(), []);
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMethod>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [productFilter, setProductFilter] = useState<"all" | string>("all");
  const [posFilter, setPosFilter] = useState<"all" | string>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentYearStr);
    transactions.forEach((tx) => {
      if (tx.date) {
        const y = new Date(tx.date).getFullYear();
        if (!isNaN(y)) {
          years.add(y.toString());
        }
      }
    });
    return Array.from(years).sort().reverse();
  }, [transactions, currentYearStr]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (year !== "all" && dateFilter && dateFilter.getFullYear().toString() !== year) {
      setDateFilter(undefined);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setDateFilter(date);
    if (date) {
      const dateYear = date.getFullYear().toString();
      if (selectedYear !== "all" && selectedYear !== dateYear) {
        setSelectedYear(dateYear);
      }
    }
  };

  const availablePosNames = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach(tx => {
      if (tx.posName) names.add(tx.posName);
    });
    return Array.from(names).sort();
  }, [transactions]);

  // Extract products that actually exist in transaction history (even if deleted from catalog)
  const availableHistoryProducts = useMemo(() => {
    const productMap = new Map<string, { key: string; name: string }>();

    transactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        if (!item) return;

        const isCustomItem = Boolean(item.isCustom || item.productId?.startsWith("custom_"));
        const filterKey = isCustomItem 
          ? `custom:${item.name || "Vlastní položka"}`
          : (item.productId || item.name);

        if (!productMap.has(filterKey)) {
          // If still in current catalog, prefer catalog name, otherwise use historical item name
          const catalogProd = !isCustomItem ? products.find((p) => p.id === item.productId) : null;
          const displayName = catalogProd?.name || item.name || "Položka bez názvu";

          productMap.set(filterKey, {
            key: filterKey,
            name: displayName,
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "cs")
    );
  }, [transactions, products]);

  // Auto-reset product filter if the filtered product is no longer present in transactions
  useEffect(() => {
    if (productFilter !== "all") {
      const exists = availableHistoryProducts.some((p) => p.key === productFilter);
      if (!exists) {
        setProductFilter("all");
      }
    }
  }, [availableHistoryProducts, productFilter]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (selectedYear !== "all") {
      filtered = filtered.filter((tx) => {
        if (!tx.date) return false;
        const txYear = new Date(tx.date).getFullYear().toString();
        return txYear === selectedYear;
      });
    }
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
        tx.items.some((item) => {
          if (productFilter.startsWith("custom:")) {
            const customName = productFilter.replace("custom:", "");
            const isCustomItem = Boolean(item.isCustom || item.productId?.startsWith("custom_"));
            return isCustomItem && (item.name || "Vlastní položka") === customName;
          }
          return item.productId === productFilter || item.name === productFilter;
        })
      );
    }
    if (posFilter !== "all") {
      filtered = filtered.filter((tx) => tx.posName === posFilter);
    }
    return filtered;
  }, [transactions, selectedYear, paymentFilter, dateFilter, productFilter, posFilter]);

  const stats = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        acc.totalRevenue += tx.total;

        let itemsToSum = tx.items;
        if (productFilter !== "all") {
          itemsToSum = tx.items.filter((item) => {
            if (productFilter.startsWith("custom:")) {
              const customName = productFilter.replace("custom:", "");
              const isCustomItem = Boolean(item.isCustom || item.productId?.startsWith("custom_"));
              return isCustomItem && (item.name || "Vlastní položka") === customName;
            }
            return item.productId === productFilter || item.name === productFilter;
          });
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

  const posBreakdown = useMemo(() => {
    const map: Record<string, {
      posName: string;
      totalRevenue: number;
      cashRevenue: number;
      qrRevenue: number;
      count: number;
      itemsSold: number;
    }> = {};

    filteredTransactions.forEach(tx => {
      const pos = tx.posName || "Hlavní pokladna";
      if (!map[pos]) {
        map[pos] = {
          posName: pos,
          totalRevenue: 0,
          cashRevenue: 0,
          qrRevenue: 0,
          count: 0,
          itemsSold: 0
        };
      }
      map[pos].totalRevenue += tx.total;
      if (tx.paymentMethod === 'cash') map[pos].cashRevenue += tx.total;
      else map[pos].qrRevenue += tx.total;
      map[pos].count += 1;
      map[pos].itemsSold += tx.items.reduce((acc, it) => acc + it.quantity, 0);
    });

    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTransactions]);

  const handleDeleteLastTransaction = async () => {
    try {
      await deleteLastTransaction();
      toast({
        title: "Úspěch",
        description: "Poslední transakce byla smazána.",
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat transakci.",
        variant: "destructive",
      });
    }
  };

  const handleBatchDelete = async () => {
    try {
      const count = selectedTransactions.size;
      await deleteBatchTransactions(Array.from(selectedTransactions));
      setSelectedTransactions(new Set());
      toast({
        title: "Úspěch",
        description: `${count} transakce byly smazány.`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat vybrané transakce.",
        variant: "destructive",
      });
    }
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
    setPosFilter("all");
    setSelectedYear(currentYearStr);
  };

  useEffect(() => {
    setSelectedTransactions((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(filteredTransactions.map((tx) => tx.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [filteredTransactions]);

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                 <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Platební metoda</Label>
                 <RadioGroup
                  value={paymentFilter}
                  onValueChange={(v) =>
                    setPaymentFilter(v as "all" | PaymentMethod)
                  }
                  className="flex items-center space-x-4"
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

              {availablePosNames.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="pos-filter" className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Zdroj (Pokladna)</Label>
                  <Select value={posFilter} onValueChange={setPosFilter}>
                    <SelectTrigger id="pos-filter" className="h-9">
                      <MonitorSmartphone className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Všechny pokladny" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny pokladny</SelectItem>
                      {availablePosNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Datum transakce</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-9 justify-start text-left font-normal",
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
                      onSelect={handleDateSelect}
                      initialFocus
                      locale={cs}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="product-filter" className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Obsahuje produkt</Label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger id="product-filter" className="h-9">
                    <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Vyberte produkt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny produkty</SelectItem>
                    {availableHistoryProducts.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Button onClick={clearFilters} variant="ghost" className="w-full h-9 border border-dashed hover:bg-muted">
                  <FilterX className="mr-2 h-4 w-4" />
                  Zrušit filtry
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 text-center">
                    <p className="text-sm text-primary/80 flex items-center justify-center gap-1.5 font-medium uppercase tracking-wider">
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
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
                      Příjem (filtr)
                    </p>
                    <p className="text-xl font-bold">
                      {stats.totalRevenue.toFixed(0)} Kč
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Transakcí</p>
                    <p className="text-xl font-bold flex items-center justify-center gap-1">
                      <Receipt className="h-4 w-4 text-muted-foreground" />{" "}
                      {filteredTransactions.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Prodáno</p>
                    <p className="text-xl font-bold flex items-center justify-center gap-1">
                      <Boxes className="h-4 w-4 text-muted-foreground" /> {stats.totalItemsSold}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Manažerský přehled podle pokladen */}
            {posBreakdown.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Manažerský přehled podle pokladen
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold text-muted-foreground bg-background">
                    {selectedYear !== "all" ? `Rok ${selectedYear}` : "Všechny roky"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {posBreakdown.map((item) => (
                    <div key={item.posName} className="p-3.5 rounded-xl border bg-card/60 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm truncate">{item.posName}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {item.count} prodejů
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-primary tabular-nums">
                        {item.totalRevenue.toFixed(0)} Kč
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border/60">
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3 text-emerald-500" /> {item.cashRevenue.toFixed(0)} Kč
                        </span>
                        <span className="flex items-center gap-1 justify-end">
                          <QrCode className="h-3 w-3 text-sky-500" /> {item.qrRevenue.toFixed(0)} Kč
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nebyly nalezeny žádné transakce.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  {/* Výběr roku */}
                  <Select value={selectedYear} onValueChange={handleYearChange}>
                    <SelectTrigger className="h-8 w-[125px] text-xs font-semibold bg-background">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Rok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny roky</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          Rok {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="h-4 w-[1px] bg-border" />

                  {/* Vybrat vše */}
                  <div className="flex items-center">
                    <Checkbox
                      id="select-all"
                      checked={
                        selectedTransactions.size === filteredTransactions.length &&
                        filteredTransactions.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                      disabled={filteredTransactions.length === 0}
                      aria-label="Vybrat vše"
                    />
                    <Label
                      htmlFor="select-all"
                      className="ml-2.5 text-xs sm:text-sm font-bold uppercase text-muted-foreground cursor-pointer select-none"
                    >
                      Vybrat vše (zobrazeno {filteredTransactions.length})
                    </Label>
                  </div>
                </div>

                {selectedTransactions.size > 0 && (
                  <span className="text-xs text-primary font-medium">
                    Vybráno: {selectedTransactions.size}
                  </span>
                )}
              </div>

              {filteredTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border-2 border-dashed m-4">
                  Pro vybrané filtry {selectedYear !== "all" ? `v roce ${selectedYear}` : ""} nebyly nalezeny žádné transakce.
                </p>
              ) : (
                filteredTransactions.map((transaction) => {
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
                      <AccordionTrigger className="flex-1 hover:no-underline">
                        <div className="flex justify-between items-end w-full pr-4">
                          <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-medium text-muted-foreground">
                              {new Date(transaction.date).toLocaleString(
                                "cs-CZ"
                              )}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge
                                  variant={paymentInfo.variant}
                                  className="h-6"
                                >
                                  {paymentInfo.icon}
                                  {paymentInfo.text}
                                </Badge>
                                {transaction.posName && (
                                  <Badge variant="outline" className="h-6 flex items-center gap-1.5 bg-background font-medium border-primary/20 text-primary">
                                    <MonitorSmartphone className="h-3 w-3" />
                                    {transaction.posName}
                                  </Badge>
                                )}
                                {transaction.variableSymbol && (
                                  <Badge variant="outline" className="h-6 font-mono text-[11px] font-bold bg-primary/5 text-primary border-primary/30">
                                    VS: {transaction.variableSymbol}
                                  </Badge>
                                )}
                            </div>
                          </div>
                          <span className="font-bold text-primary text-xl">
                            {transaction.total.toFixed(0)} Kč
                          </span>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="pl-12 space-y-4 pr-4 pb-6">
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="h-9 text-xs">Produkt</TableHead>
                              <TableHead className="text-center h-9 text-xs">
                                Množství
                              </TableHead>
                              <TableHead className="text-right h-9 text-xs">Cena</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transaction.items.map((item) => (
                              <TableRow key={item.productId} className="hover:bg-transparent">
                                <TableCell className="py-2.5 font-medium">{item.name}</TableCell>
                                <TableCell className="text-center py-2.5">
                                  {item.quantity} ks
                                </TableCell>
                                <TableCell className="text-right py-2.5 font-semibold">
                                  {(item.price * item.quantity).toFixed(0)} Kč
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/20 border-t-2">
                               <TableCell colSpan={2} className="py-3 font-bold">Celková hodnota</TableCell>
                               <TableCell className="text-right py-3 font-bold text-primary text-lg">{transaction.total.toFixed(0)} Kč</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex flex-wrap justify-between items-center gap-2 px-1 italic">
                         <span>ID: {transaction.id}</span>
                         {transaction.variableSymbol && <span className="font-mono font-semibold text-primary">VS: {transaction.variableSymbol}</span>}
                         {transaction.posName && <span>Zdroj: {transaction.posName}</span>}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
