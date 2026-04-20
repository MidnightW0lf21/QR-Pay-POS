
"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Percent, 
  ArrowLeft, 
  Receipt, 
  PiggyBank, 
  BarChart3, 
  Calendar as CalendarIcon,
  FilterX,
  LayoutGrid,
  Rows,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Product, Transaction } from "@/lib/types";
import { PRODUCTS_STORAGE_KEY, TRANSACTIONS_STORAGE_KEY } from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Date range filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Chart interactivity states
  const [chartMode, setChartMode] = useState<"stacked" | "grouped">("stacked");
  const [showCost, setShowCost] = useState(true);
  const [showProfit, setShowProfit] = useState(true);

  useEffect(() => {
    if (isMounted) {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }
    }
  }, [isMounted]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(tx => {
      years.add(new Date(tx.date).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (selectedYear !== "all") {
      result = result.filter(tx => new Date(tx.date).getFullYear().toString() === selectedYear);
    }

    if (dateFrom || dateTo) {
      result = result.filter(tx => {
        const txDate = new Date(tx.date);
        const start = dateFrom ? startOfDay(dateFrom) : new Date(0);
        const end = dateTo ? endOfDay(dateTo) : new Date(8640000000000000);
        
        return isWithinInterval(txDate, { start, end });
      });
    }
    
    return result;
  }, [transactions, dateFrom, dateTo, selectedYear]);

  const inventoryStats = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = p.stock || 0;
      const cost = p.costPrice || 0;
      const price = p.price || 0;

      acc.totalInvestment += stock * cost;
      acc.totalPotentialRevenue += stock * price;
      acc.totalPotentialProfit += stock * (price - cost);
      return acc;
    }, { totalInvestment: 0, totalPotentialRevenue: 0, totalPotentialProfit: 0 });
  }, [products]);

  const realizedStats = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => {
      acc.totalRevenue += tx.total;
      
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = product?.costPrice || 0;
        acc.totalProfit += (item.price - costPrice) * item.quantity;
      });
      
      return acc;
    }, { totalRevenue: 0, totalProfit: 0 });
  }, [filteredTransactions, products]);

  const dailyProfitData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    const costMap: Record<string, number> = {};

    filteredTransactions.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      revenueMap[dateKey] = (revenueMap[dateKey] || 0) + tx.total;
      
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = product?.costPrice || 0;
        costMap[dateKey] = (costMap[dateKey] || 0) + (costPrice * item.quantity);
      });
    });

    const activeDates = Object.keys(revenueMap).sort();

    return activeDates.map(dateStr => {
      const revenue = Math.round(revenueMap[dateStr] || 0);
      const cost = Math.round(costMap[dateStr] || 0);
      return {
        name: format(new Date(dateStr), 'd.M.', { locale: cs }),
        cost: cost,
        profit: Math.max(0, revenue - cost),
        date: dateStr 
      };
    });
  }, [filteredTransactions, products]);

  const productProfitability = useMemo(() => {
    return products.map(p => {
      const price = p.price || 0;
      const cost = p.costPrice || 0;
      const stock = p.stock || 0;
      const profit = price - cost;
      const margin = price > 0 ? (profit / price) * 100 : 0;
      
      return {
        ...p,
        price,
        costPrice: cost,
        profitPerUnit: profit,
        marginPercent: margin,
        totalPotentialProfit: profit * stock
      };
    }).sort((a, b) => b.profitPerUnit - a.profitPerUnit);
  }, [products]);

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
    <div className="container mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" asChild className="mb-2 -ml-2">
              <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" /> Zpět do nastavení
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Inventura & Ziskovost</h1>
            <p className="text-muted-foreground">Přehled o hodnotě skladu a reálných ziscích.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtry:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  {dateFrom ? format(dateFrom, "d. M. yyyy") : "Od"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  locale={cs}
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">–</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  {dateTo ? format(dateTo, "d. M. yyyy") : "Do"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  locale={cs}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-[120px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger size="sm" className="h-9">
                <SelectValue placeholder="Rok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny roky</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(dateFrom || dateTo || selectedYear !== "all") && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
              <FilterX className="h-4 w-4 mr-2" />
              Zrušit filtry
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <DollarSign className="h-3.5 w-3.5" /> Hodnota skladu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inventoryStats.totalInvestment.toFixed(0)} Kč</p>
            <p className="text-xs text-muted-foreground mt-1">Kapitál uložený v zásobách</p>
          </CardContent>
        </Card>

        <Card className="bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="h-3.5 w-3.5" /> Potenciální zisk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{inventoryStats.totalPotentialProfit.toFixed(0)} Kč</p>
            <p className="text-xs text-muted-foreground mt-1">Zisk po doprodání skladu</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Receipt className="h-3.5 w-3.5" /> Tržba v období
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{realizedStats.totalRevenue.toFixed(0)} Kč</p>
            <p className="text-xs text-muted-foreground mt-1">Reálně utrženo za vybraný čas</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <PiggyBank className="h-3.5 w-3.5" /> Zisk v období
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{realizedStats.totalProfit.toFixed(0)} Kč</p>
            <p className="text-xs text-muted-foreground mt-1">Čistý výdělek po nákupu</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Denní aktivita
                </CardTitle>
                <CardDescription>Zobrazuje pouze dny s aktivními prodeji v rámci filtru.</CardDescription>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-2 rounded-lg border">
                <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as any)} className="w-auto">
                  <TabsList className="h-8">
                    <TabsTrigger value="stacked" className="text-xs py-1">
                      <Rows className="h-3 w-3 mr-1.5" /> Skládaný
                    </TabsTrigger>
                    <TabsTrigger value="grouped" className="text-xs py-1">
                      <LayoutGrid className="h-3 w-3 mr-1.5" /> Vedle sebe
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="flex items-center gap-4 px-2 border-l">
                  <div className="flex items-center space-x-2">
                    <Switch id="show-cost" checked={showCost} onCheckedChange={setShowCost} />
                    <Label htmlFor="show-cost" className="text-xs cursor-pointer flex items-center gap-1.5">
                      {showCost ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      Nákup
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="show-profit" checked={showProfit} onCheckedChange={setShowProfit} />
                    <Label htmlFor="show-profit" className="text-xs cursor-pointer flex items-center gap-1.5">
                      {showProfit ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      Zisk
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            {dailyProfitData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProfitData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888844" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => `${v} Kč`} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderRadius: '8px', 
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{value === 'cost' ? 'Nákup' : 'Zisk'}</span>}
                  />
                  {showCost && (
                    <Bar 
                      dataKey="cost" 
                      name="cost" 
                      stackId={chartMode === 'stacked' ? 'a' : undefined} 
                      fill="#94a3b8" 
                      radius={chartMode === 'grouped' ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                    />
                  )}
                  {showProfit && (
                    <Bar 
                      dataKey="profit" 
                      name="profit" 
                      stackId={chartMode === 'stacked' ? 'a' : undefined} 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]} 
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                Pro vybraný rozsah neexistují žádná data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabulka produktové ziskovosti</CardTitle>
            <CardDescription>Podrobný rozpis nákladů a marží pro jednotlivé produkty.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead className="text-center">Sklad</TableHead>
                    <TableHead className="text-right">Nákup</TableHead>
                    <TableHead className="text-right">Prodej</TableHead>
                    <TableHead className="text-right">Zisk / ks</TableHead>
                    <TableHead className="text-right">Marže (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productProfitability.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.stock <= 5 ? "destructive" : "secondary"}>
                          {p.stock} ks
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{(p.costPrice || 0).toFixed(0)} Kč</TableCell>
                      <TableCell className="text-right font-semibold">{(p.price || 0).toFixed(0)} Kč</TableCell>
                      <TableCell className="text-right text-success font-bold">
                        +{(p.profitPerUnit || 0).toFixed(0)} Kč
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Percent className="h-3 w-3" />
                          {(p.marginPercent || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
