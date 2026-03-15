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
import { Loader2, TrendingUp, DollarSign, Package, Percent, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";
import { PRODUCTS_STORAGE_KEY } from "@/lib/constants";
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
  Cell,
} from "recharts";

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#f97316'];

export default function InventoryPage() {
  const isMounted = useIsMounted();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (isMounted) {
      const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
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

  const productProfitability = useMemo(() => {
    return products.map(p => {
      const profit = p.price - (p.costPrice || 0);
      const margin = p.price > 0 ? (profit / p.price) * 100 : 0;
      return {
        ...p,
        profitPerUnit: profit,
        marginPercent: margin,
        totalPotentialProfit: profit * p.stock
      };
    }).sort((a, b) => b.profitPerUnit - a.profitPerUnit);
  }, [products]);

  const chartData = useMemo(() => {
    return productProfitability.slice(0, 10).map(p => ({
      name: p.name,
      'Prodejní cena': p.price,
      'Nákupní cena': p.costPrice || 0,
      'Zisk': p.profitPerUnit
    }));
  }, [productProfitability]);

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
          <p className="text-muted-foreground">Přehled o hodnotě vašeho skladu a ziscích.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Hodnota skladu (Investice)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inventoryStats.totalInvestment.toFixed(0)} Kč</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Potenciální zisk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{inventoryStats.totalPotentialProfit.toFixed(0)} Kč</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Celková hodnota prodeje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inventoryStats.totalPotentialRevenue.toFixed(0)} Kč</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Porovnání cen a zisku</CardTitle>
            <CardDescription>Top 10 produktů podle zisku na jednotku.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888844" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} Kč`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="Nákupní cena" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prodejní cena" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Zisk" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                      <TableCell className="text-right text-muted-foreground">{p.costPrice.toFixed(0)} Kč</TableCell>
                      <TableCell className="text-right font-semibold">{p.price.toFixed(0)} Kč</TableCell>
                      <TableCell className="text-right text-success font-bold">
                        +{p.profitPerUnit.toFixed(0)} Kč
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Percent className="h-3 w-3" />
                          {p.marginPercent.toFixed(1)}%
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
