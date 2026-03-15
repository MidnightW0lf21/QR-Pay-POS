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
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Package, Percent, ArrowLeft, Receipt, PiggyBank, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { format, subDays } from "date-fns";
import { cs } from "date-fns/locale";

export default function InventoryPage() {
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
    return transactions.reduce((acc, tx) => {
      acc.totalRevenue += tx.total;
      
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = product?.costPrice || 0;
        acc.totalProfit += (item.price - costPrice) * item.quantity;
      });
      
      return acc;
    }, { totalRevenue: 0, totalProfit: 0 });
  }, [transactions, products]);

  const dailyProfitData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueMap: Record<string, number> = {};
    const costMap: Record<string, number> = {};

    transactions.forEach(tx => {
      const dateKey = tx.date.split('T')[0];
      revenueMap[dateKey] = (revenueMap[dateKey] || 0) + tx.total;
      
      tx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = product?.costPrice || 0;
        costMap[dateKey] = (costMap[dateKey] || 0) + (costPrice * item.quantity);
      });
    });

    return last30Days.map(dateStr => {
      const revenue = Math.round(revenueMap[dateStr] || 0);
      const cost = Math.round(costMap[dateStr] || 0);
      return {
        name: format(new Date(dateStr), 'd.M.', { locale: cs }),
        cost: cost,
        profit: Math.max(0, revenue - cost)
      };
    });
  }, [transactions, products]);

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

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-2">
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" /> Zpět do nastavení
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Inventura & Ziskovost</h1>
          <p className="text-muted-foreground">Přehled o hodnotě skladu a reálných ziscích.</p>
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
            <p className="text-xs text-muted-foreground mt-1">Kapitál uložený v produktech</p>
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
            <p className="text-xs text-muted-foreground mt-1">Zisk po doprodání zásob</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <Receipt className="h-3.5 w-3.5" /> Celková tržba
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{realizedStats.totalRevenue.toFixed(0)} Kč</p>
            <p className="text-xs text-muted-foreground mt-1">Reálně utrženo z historie</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <PiggyBank className="h-3.5 w-3.5" /> Reálný zisk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{realizedStats.totalProfit.toFixed(0)} Kč</p>
            <p className="text-xs text-muted-foreground mt-1">Čistý výdělek po odečtení nákupu</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Denní ziskovost (30 dní)
            </CardTitle>
            <CardDescription>Vizualizace nákladů (šedá) a zisku (zelená) v čase.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyProfitData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888844" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} Kč`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="cost" name="Nákup" stackId="a" fill="#94a3b8" />
                <Bar dataKey="profit" name="Zisk" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabulka ziskovosti</CardTitle>
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
