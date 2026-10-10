"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  QrCode,
  Calendar as CalendarIcon,
  Clock,
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  Boxes,
  Store,
  Receipt,
  Scissors,
  Sparkles,
  FilterX,
  PieChart as PieChartIcon,
  MonitorSmartphone,
  Layers,
  Flame,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  eachDayOfInterval,
  getDay,
  parseISO,
  isSameDay
} from "date-fns";
import { cs } from "date-fns/locale";
import { useDataContext } from "@/context/DataContext";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { getProductCategories } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
const CZECH_DAYS = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
const CZECH_DAYS_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const CZECH_DAYS_ORDERED = [1, 2, 3, 4, 5, 6, 0]; // Po až Ne

export default function ManagerDashboardPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { transactions, products, categories } = useDataContext();

  // Filters state
  const currentYearStr = useMemo(() => new Date().getFullYear().toString(), []);
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [posFilter, setPosFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Privacy toggle (show/hide sensitive profit & margins)
  const [showProfit, setShowProfit] = useState<boolean>(true);

  // Heatmap metric mode
  const [calendarMetric, setCalendarMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("qr-pay-manager-show-profit");
        if (stored !== null) setShowProfit(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const toggleShowProfit = () => {
    setShowProfit((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("qr-pay-manager-show-profit", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Available POS registers
  const availablePosNames = useMemo(() => {
    const names = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.posName) names.add(tx.posName);
    });
    return Array.from(names).sort();
  }, [transactions]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentYearStr);
    transactions.forEach((tx) => {
      if (tx.date) {
        const y = new Date(tx.date).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [transactions, currentYearStr]);

  // Filtered transactions based on active filters
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);

      // POS register filter
      if (posFilter !== "all" && tx.posName !== posFilter) {
        return false;
      }

      // Explicit Date Range (dateFrom / dateTo)
      if (dateFrom && dateTo) {
        return isWithinInterval(txDate, {
          start: startOfDay(dateFrom),
          end: endOfDay(dateTo),
        });
      } else if (dateFrom) {
        if (txDate < startOfDay(dateFrom)) return false;
      } else if (dateTo) {
        if (txDate > endOfDay(dateTo)) return false;
      }

      // Quick Period Filter
      if (periodFilter === "today") {
        return txDate.toDateString() === now.toDateString();
      } else if (periodFilter === "week") {
        return isWithinInterval(txDate, {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        });
      } else if (periodFilter === "month") {
        return isWithinInterval(txDate, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
      }

      // Year filter (if no explicit custom range)
      if (selectedYear !== "all") {
        if (txDate.getFullYear().toString() !== selectedYear) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, posFilter, dateFrom, dateTo, periodFilter, selectedYear]);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let cashRevenue = 0;
    let qrRevenue = 0;
    let totalItemsCount = 0;
    let totalCostOfSold = 0;
    let freeItemsCount = 0;
    let freeItemsValue = 0;
    let discountsGivenTotal = 0;

    // Fast lookup map for cost prices
    const productCostMap = new Map<string, number>();
    products.forEach((p) => productCostMap.set(p.id, Number(p.costPrice) || 0));

    filteredTransactions.forEach((tx) => {
      totalRevenue += tx.total;
      if (tx.paymentMethod === "cash") cashRevenue += tx.total;
      else qrRevenue += tx.total;

      tx.items?.forEach((item) => {
        const qty = item.quantity || 1;
        totalItemsCount += qty;

        const cost = productCostMap.get(item.productId) || 0;
        totalCostOfSold += cost * qty;

        // Free items & discounts tracking
        if (item.price === 0) {
          freeItemsCount += qty;
          const origPrice = item.originalPrice !== undefined ? item.originalPrice : (products.find(p => p.id === item.productId)?.price || 0);
          freeItemsValue += origPrice * qty;
        } else if (item.originalPrice !== undefined && item.price < item.originalPrice) {
          discountsGivenTotal += (item.originalPrice - item.price) * qty;
        }
      });
    });

    const netProfit = totalRevenue - totalCostOfSold;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const aov = filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;

    // Inventory value calculation
    const inventoryCostValue = products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stock || 0)), 0);
    const inventoryRetailValue = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
    const inventoryPotentialProfit = inventoryRetailValue - inventoryCostValue;

    return {
      totalRevenue,
      cashRevenue,
      qrRevenue,
      transactionsCount: filteredTransactions.length,
      totalItemsCount,
      totalCostOfSold,
      netProfit,
      marginPercent,
      aov,
      freeItemsCount,
      freeItemsValue,
      discountsGivenTotal,
      inventoryCostValue,
      inventoryRetailValue,
      inventoryPotentialProfit,
    };
  }, [filteredTransactions, products]);

  // -------------------------------------------------------------
  // DYNAMIC CALENDAR HEATMAP (1 až 3 aktivní měsíce podle aktivity)
  // -------------------------------------------------------------
  const calendarHeatmapData = useMemo(() => {
    // Find min and max date among filtered transactions (or fallback to recent)
    const validDates = filteredTransactions
      .map((tx) => new Date(tx.date))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (validDates.length === 0) {
      return { weeks: [], maxDayRevenue: 0, maxDayOrders: 0, activeRangeLabel: "Žádná data" };
    }

    const firstDate = validDates[0];
    const lastDate = validDates[validDates.length - 1];

    // Align to start of first month and end of last month
    const rangeStart = startOfMonth(firstDate);
    const rangeEnd = endOfMonth(lastDate);

    // Build day map
    const dayStats = new Map<string, {
      date: Date;
      revenue: number;
      orders: number;
      itemsCount: number;
      cashRevenue: number;
      qrRevenue: number;
      topProduct: string;
      productCounts: Record<string, number>;
    }>();

    // Populate filtered transactions
    filteredTransactions.forEach((tx) => {
      const dayKey = format(new Date(tx.date), "yyyy-MM-dd");
      let entry = dayStats.get(dayKey);
      if (!entry) {
        entry = {
          date: new Date(tx.date),
          revenue: 0,
          orders: 0,
          itemsCount: 0,
          cashRevenue: 0,
          qrRevenue: 0,
          topProduct: "",
          productCounts: {},
        };
        dayStats.set(dayKey, entry);
      }
      entry.revenue += tx.total;
      entry.orders += 1;
      if (tx.paymentMethod === "cash") entry.cashRevenue += tx.total;
      else entry.qrRevenue += tx.total;

      tx.items?.forEach((it) => {
        const qty = it.quantity || 1;
        entry!.itemsCount += qty;
        const name = it.name || "Neznámý";
        entry!.productCounts[name] = (entry!.productCounts[name] || 0) + qty;
      });
    });

    // Compute top products for each active day
    dayStats.forEach((entry) => {
      let maxQty = 0;
      let topName = "-";
      Object.entries(entry.productCounts).forEach(([name, count]) => {
        if (count > maxQty) {
          maxQty = count;
          topName = `${name} (${count} ks)`;
        }
      });
      entry.topProduct = topName;
    });

    // Generate all days in interval
    const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    let maxDayRevenue = 0;
    let maxDayOrders = 0;
    dayStats.forEach((e) => {
      if (e.revenue > maxDayRevenue) maxDayRevenue = e.revenue;
      if (e.orders > maxDayOrders) maxDayOrders = e.orders;
    });

    // Group into weeks (Monday to Sunday)
    // Find the Monday of the first week
    const calendarStartMonday = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const calendarEndSunday = endOfWeek(rangeEnd, { weekStartsOn: 1 });
    const fullCalendarDays = eachDayOfInterval({ start: calendarStartMonday, end: calendarEndSunday });

    const weeks: Array<Array<{
      date: Date;
      dayKey: string;
      inCurrentRange: boolean;
      stats?: {
        revenue: number;
        orders: number;
        itemsCount: number;
        cashRevenue: number;
        qrRevenue: number;
        topProduct: string;
      };
    }>> = [];

    let currentWeek: Array<any> = [];
    fullCalendarDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const inRange = day >= rangeStart && day <= rangeEnd;
      const stats = dayStats.get(dayKey);

      currentWeek.push({
        date: day,
        dayKey,
        inCurrentRange: inRange,
        stats,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    const activeRangeLabel = `${format(firstDate, "d. MMMM yyyy", { locale: cs })} – ${format(lastDate, "d. MMMM yyyy", { locale: cs })}`;

    return {
      weeks,
      maxDayRevenue: maxDayRevenue || 1,
      maxDayOrders: maxDayOrders || 1,
      activeRangeLabel,
    };
  }, [filteredTransactions]);

  // -------------------------------------------------------------
  // DYNAMIC HOURLY & WEEKDAY HEATMAP (Pouze hodiny se skutečným prodejem)
  // -------------------------------------------------------------
  const hourlyWeekdayData = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return { matrix: [], hours: [17, 18, 19, 20, 21, 22], maxHourlyRevenue: 1 };
    }

    const recordedHours: number[] = [];
    // 7 days x 24 hours table
    const grid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    const gridOrders: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      const dayIdx = d.getDay(); // 0 is Sunday, 1 is Monday ...
      const hour = d.getHours();
      recordedHours.push(hour);

      grid[dayIdx][hour] += tx.total;
      gridOrders[dayIdx][hour] += 1;
    });

    // Dynamic hour bounds (trimmed to actual activity)
    const minHour = Math.max(0, Math.min(...recordedHours));
    const maxHour = Math.min(23, Math.max(...recordedHours));

    const activeHours: number[] = [];
    for (let h = minHour; h <= maxHour; h++) {
      activeHours.push(h);
    }

    let maxHourlyRevenue = 0;
    CZECH_DAYS_ORDERED.forEach((dayIdx) => {
      activeHours.forEach((hour) => {
        const val = grid[dayIdx][hour];
        if (val > maxHourlyRevenue) maxHourlyRevenue = val;
      });
    });

    return {
      grid,
      gridOrders,
      hours: activeHours.length > 0 ? activeHours : [17, 18, 19, 20, 21, 22],
      maxHourlyRevenue: maxHourlyRevenue || 1,
    };
  }, [filteredTransactions]);

  // -------------------------------------------------------------
  // POS REGISTER BREAKDOWN
  // -------------------------------------------------------------
  const posBreakdown = useMemo(() => {
    const map: Record<string, {
      posName: string;
      totalRevenue: number;
      cashRevenue: number;
      qrRevenue: number;
      ordersCount: number;
      itemsSold: number;
    }> = {};

    filteredTransactions.forEach((tx) => {
      const pos = tx.posName || "Hlavní pokladna";
      if (!map[pos]) {
        map[pos] = {
          posName: pos,
          totalRevenue: 0,
          cashRevenue: 0,
          qrRevenue: 0,
          ordersCount: 0,
          itemsSold: 0,
        };
      }
      map[pos].totalRevenue += tx.total;
      if (tx.paymentMethod === "cash") map[pos].cashRevenue += tx.total;
      else map[pos].qrRevenue += tx.total;
      map[pos].ordersCount += 1;
      map[pos].itemsSold += tx.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
    });

    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTransactions]);

  // -------------------------------------------------------------
  // CATEGORY SHARE (Donut Chart)
  // -------------------------------------------------------------
  const categoryShareData = useMemo(() => {
    const productCategoryMap = new Map<string, string[]>();
    products.forEach((p) => {
      productCategoryMap.set(p.id, getProductCategories(p));
    });

    const catTotals: Record<string, number> = {};

    filteredTransactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        const cats = productCategoryMap.get(item.productId) || ["Ostatní"];
        const primaryCat = cats[0] || "Ostatní";
        const val = item.price * (item.quantity || 1);
        catTotals[primaryCat] = (catTotals[primaryCat] || 0) + val;
      });
    });

    return Object.entries(catTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, products]);

  // -------------------------------------------------------------
  // EXPORT REPORT TO EXCEL
  // -------------------------------------------------------------
  const handleExportManagerReport = () => {
    const summaryData = [
      ["MANAŽERSKÝ REPORT PRODEJŮ A ZISKOVOSTI"],
      ["Vygenerováno:", new Date().toLocaleString("cs-CZ")],
      ["Vybrané období:", periodFilter],
      ["Vybraný rok:", selectedYear],
      ["Pokladna:", posFilter],
      [],
      ["KLÍČOVÉ UKAZATELE (KPI)", "Hodnota"],
      ["Celková tržba (Kč):", kpis.totalRevenue],
      ["Tržba v hotovosti (Kč):", kpis.cashRevenue],
      ["Tržba přes QR platby (Kč):", kpis.qrRevenue],
      ["Počet transakcí:", kpis.transactionsCount],
      ["Počet prodaných kusů:", kpis.totalItemsCount],
      ["Průměrný nákup (AOV v Kč):", Math.round(kpis.aov)],
      ["Nákupní náklady (Kč):", kpis.totalCostOfSold],
      ["Čistý zisk (Kč):", kpis.netProfit],
      ["Marže (%):", `${kpis.marginPercent.toFixed(1)} %`],
      ["Položek vydáno zdarma (ks):", kpis.freeItemsCount],
      ["Hodnota vydaného zboží zdarma (Kč):", kpis.freeItemsValue],
      [],
      ["VÝKON POKLADEN", "Tržba (Kč)", "Hotovost (Kč)", "QR (Kč)", "Počet účtenek"],
      ...posBreakdown.map((p) => [p.posName, p.totalRevenue, p.cashRevenue, p.qrRevenue, p.ordersCount]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manažerský přehled");
    XLSX.writeFile(wb, `manazersky_prehled_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  const handleResetFilters = () => {
    setSelectedYear(currentYearStr);
    setPeriodFilter("all");
    setPosFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-3 sm:p-5 md:p-6 pb-24 space-y-6">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Link href="/settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <TrendingUp className="h-7 w-7 text-primary" />
              Manažerský přehled
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground ml-10">
            Dynamické kalendářní a hodinové heatmapy, ziskovost a výkon pokladen.
          </p>
        </div>

        {/* Global Toolbar: Privacy Eye Toggle & Export */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant={showProfit ? "outline" : "secondary"}
            size="sm"
            onClick={toggleShowProfit}
            className="h-9 gap-1.5 text-xs font-semibold"
            title={showProfit ? "Skrýt citlivá data (zisk, nákupní náklady)" : "Zobrazit zisk a marže"}
          >
            {showProfit ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <span>{showProfit ? "Zisk zobrazen" : "Zisk skryt"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportManagerReport}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportovat (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* FILTER BAR: Period chips, Year, Register, and Date range */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick period pills */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl">
            {[
              { id: "all", label: "Vše" },
              { id: "today", label: "Dnes" },
              { id: "week", label: "Tento týden" },
              { id: "month", label: "Tento měsíc" },
            ].map((p) => (
              <Button
                key={p.id}
                variant={periodFilter === p.id && !dateFrom && !dateTo ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setPeriodFilter(p.id as any);
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
                className="h-7 text-xs font-semibold rounded-lg px-2.5"
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Year selector */}
          <div className="w-[120px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-background">
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
          </div>

          {/* POS Register selector */}
          {availablePosNames.length > 0 && (
            <div className="w-[150px]">
              <Select value={posFilter} onValueChange={setPosFilter}>
                <SelectTrigger className="h-8 text-xs font-semibold bg-background">
                  <MonitorSmartphone className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Pokladna" />
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

          {/* Date Range Popover */}
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start font-normal">
                  {dateFrom ? format(dateFrom, "d. M.") : "Od"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus locale={cs} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">–</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start font-normal">
                  {dateTo ? format(dateTo, "d. M.") : "Do"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus locale={cs} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Reset filter button */}
        {(periodFilter !== "all" || posFilter !== "all" || dateFrom || dateTo || selectedYear !== currentYearStr) && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <FilterX className="h-3.5 w-3.5 mr-1" /> Resetovat filtry
          </Button>
        )}
      </div>

      {/* SECTION 1: EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="border-primary/20 bg-primary/5 relative overflow-hidden shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Celkový obrat</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
              {kpis.totalRevenue.toFixed(0)} Kč
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-2 mt-2 border-t border-border/60">
              <span className="flex items-center gap-1 font-medium">
                <Wallet className="h-3 w-3 text-emerald-500" /> {kpis.cashRevenue.toFixed(0)} Kč
              </span>
              <span className="flex items-center gap-1 font-medium justify-end">
                <QrCode className="h-3 w-3 text-sky-500" /> {kpis.qrRevenue.toFixed(0)} Kč
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit & Margin (Privacy Sensitive) */}
        <Card className="border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Čistý zisk & Marže</span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {showProfit ? `${kpis.netProfit.toFixed(0)} Kč` : "••••• Kč"}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 mt-2 border-t border-border/60">
              <span>Marže z prodeje:</span>
              <span className="font-bold text-foreground">
                {showProfit ? `${kpis.marginPercent.toFixed(1)} %` : "••• %"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Orders Count & Average Order Value (AOV) */}
        <Card className="border-border bg-card/60 shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nákupy & Průměrná útrata</span>
              <Receipt className="h-4 w-4 text-sky-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl sm:text-3xl font-black tabular-nums">
              {kpis.transactionsCount} <span className="text-sm font-semibold text-muted-foreground">nákupů</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 mt-2 border-t border-border/60">
              <span>Průměrný nákup (AOV):</span>
              <span className="font-bold text-foreground tabular-nums">
                {Math.round(kpis.aov)} Kč
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value & Potential */}
        <Card className="border-border bg-card/60 shadow-xs">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aktuální hodnota skladu</span>
              <Boxes className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl sm:text-3xl font-black tabular-nums text-foreground">
              {showProfit ? `${kpis.inventoryCostValue.toFixed(0)} Kč` : "••••• Kč"}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 mt-2 border-t border-border/60">
              <span>V prodejních cenách:</span>
              <span className="font-bold text-foreground tabular-nums">
                {kpis.inventoryRetailValue.toFixed(0)} Kč
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: DYNAMIC CALENDAR HEATMAP (1 až 3 aktivní měsíce s neonovým GLOW) */}
      <Card className="border bg-card/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-emerald-500" />
                Kalendářní heatmapa tržeb
              </CardTitle>
              <CardDescription className="text-xs">
                Aktivní období: <strong>{calendarHeatmapData.activeRangeLabel}</strong> • Čím vyšší tržba, tím silnější záření.
              </CardDescription>
            </div>

            {/* Metric Switch */}
            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl self-start sm:self-auto">
              <Button
                variant={calendarMetric === "revenue" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCalendarMetric("revenue")}
                className="h-7 text-xs font-semibold px-2.5 rounded-lg"
              >
                Tržba (Kč)
              </Button>
              <Button
                variant={calendarMetric === "orders" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCalendarMetric("orders")}
                className="h-7 text-xs font-semibold px-2.5 rounded-lg"
              >
                Počet nákupů
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-6">
          <TooltipProvider delayDuration={100}>
            {calendarHeatmapData.weeks.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Pro vybrané filtry nejsou zaznamenány žádné prodeje.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto pb-2">
                  <div className="inline-flex flex-col gap-1.5 min-w-full">
                    {/* Weekday labels row + Days Grid */}
                    <div className="flex gap-2">
                      {/* Weekday labels (Po až Ne) */}
                      <div className="flex flex-col gap-2 select-none text-[10px] font-bold text-muted-foreground shrink-0">
                        {/* Header spacer matching Month label header */}
                        <div className="h-4" />
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">Po</div>
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">Út</div>
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">St</div>
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">Čt</div>
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">Pá</div>
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">So</div>
                        <div className="h-7 sm:h-8 flex items-center justify-end pr-1.5">Ne</div>
                      </div>

                      {/* Weeks Columns */}
                      <div className="flex gap-2">
                        {calendarHeatmapData.weeks.map((week, weekIdx) => {
                          const firstDayOfWeek = week[0]?.date;
                          const showMonthLabel = firstDayOfWeek && (firstDayOfWeek.getDate() <= 7 || weekIdx === 0);

                          return (
                            <div key={weekIdx} className="flex flex-col gap-2">
                              {/* Month label header */}
                              <div className="h-4 text-[10px] font-bold text-muted-foreground uppercase text-center truncate w-7 sm:w-8">
                                {showMonthLabel ? format(firstDayOfWeek, "LLL", { locale: cs }) : ""}
                              </div>

                              {/* 7 Day cells in column */}
                              {week.map((dayItem, dayIdx) => {
                                const stats = dayItem.stats;
                                const val = stats ? (calendarMetric === "revenue" ? stats.revenue : stats.orders) : 0;
                                const maxVal = calendarMetric === "revenue" ? calendarHeatmapData.maxDayRevenue : calendarHeatmapData.maxDayOrders;
                                const ratio = maxVal > 0 ? val / maxVal : 0;

                                // Neon Glow & Color scale
                                let cellStyle = "bg-muted/20 border-border/40 text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/40";
                                let glowStyle = "";

                                if (stats && val > 0) {
                                  if (ratio > 0.8) {
                                    // Tier 4: Record Peak day -> Neon emerald with high glow
                                    cellStyle = "bg-emerald-400 border-emerald-300 text-emerald-950 font-black";
                                    glowStyle = "shadow-[0_0_16px_rgba(52,211,153,0.85)] ring-1 ring-emerald-300";
                                  } else if (ratio > 0.45) {
                                    // Tier 3: Strong day -> Bright emerald with medium glow
                                    cellStyle = "bg-emerald-600 border-emerald-400 text-white font-bold";
                                    glowStyle = "shadow-[0_0_10px_rgba(16,185,129,0.55)]";
                                  } else if (ratio > 0.2) {
                                    // Tier 2: Medium day -> Emerald
                                    cellStyle = "bg-emerald-800 border-emerald-600 text-emerald-100";
                                    glowStyle = "shadow-[0_0_6px_rgba(16,185,129,0.3)]";
                                  } else {
                                    // Tier 1: Light day
                                    cellStyle = "bg-emerald-950/80 border-emerald-800 text-emerald-300";
                                    glowStyle = "shadow-[0_0_3px_rgba(16,185,129,0.15)]";
                                  }
                                }

                                return (
                                  <Tooltip key={dayItem.dayKey}>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Fast drill-down to history for this day
                                          router.push(`/history`);
                                        }}
                                        className={cn(
                                          "w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-[10px] select-none transition-all duration-200 cursor-pointer active:scale-95",
                                          cellStyle,
                                          glowStyle,
                                          !dayItem.inCurrentRange && "opacity-25"
                                        )}
                                      >
                                        {dayItem.date.getDate()}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="p-2.5 max-w-xs text-xs space-y-1">
                                      <div className="font-bold text-foreground">
                                        {format(dayItem.date, "EEEE, d. MMMM yyyy", { locale: cs })}
                                      </div>
                                      {stats ? (
                                        <div className="space-y-0.5 text-muted-foreground pt-1 border-t">
                                          <div className="flex justify-between gap-3 text-foreground font-semibold">
                                            <span>Tržba:</span>
                                            <span className="text-emerald-500 font-bold">{stats.revenue.toFixed(0)} Kč</span>
                                          </div>
                                          <div className="flex justify-between gap-3">
                                            <span>Počet nákupů:</span>
                                            <span className="font-medium text-foreground">{stats.orders}×</span>
                                          </div>
                                          <div className="flex justify-between gap-3">
                                            <span>Hotovost / QR:</span>
                                            <span className="font-medium text-foreground">{stats.cashRevenue} Kč / {stats.qrRevenue} Kč</span>
                                          </div>
                                          {stats.topProduct && stats.topProduct !== "-" && (
                                            <div className="flex justify-between gap-3 pt-0.5 text-[11px] text-amber-500 font-medium">
                                              <span>Nejprodávanější:</span>
                                              <span>{stats.topProduct}</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-muted-foreground italic">Žádné zaznamenané prodeje</div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scale legend */}
                    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-3 border-t mt-2">
                      <span className="text-[11px]">0 Kč</span>
                      <div className="w-4 h-4 rounded bg-muted/30 border" />
                      <div className="w-4 h-4 rounded bg-emerald-950 border border-emerald-800" />
                      <div className="w-4 h-4 rounded bg-emerald-800 border border-emerald-600 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                      <div className="w-4 h-4 rounded bg-emerald-600 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
                      <div className="w-4 h-4 rounded bg-emerald-400 border border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.85)]" />
                      <span className="text-[11px] font-semibold text-emerald-500">Rekordní den</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* SECTION 3: DYNAMIC HOURLY & WEEKDAY MATRIX (Špičky v provozu) */}
      <Card className="border bg-card/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-sky-500" />
                Hodinová heatmapa & Provozní špičky
              </CardTitle>
              <CardDescription className="text-xs">
                Rozložení tržeb v otevírací době (dny v týdnu × hodiny se zaznamenaným prodejem).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex flex-col gap-1.5 min-w-full">
              {/* Hour header labels */}
              <div className="flex gap-1.5 items-center pl-16">
                {hourlyWeekdayData.hours.map((h) => (
                  <div key={h} className="w-12 sm:w-14 text-center text-[11px] font-bold text-muted-foreground uppercase">
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Rows for each day of week (Po až Ne) */}
              {CZECH_DAYS_ORDERED.map((dayIdx) => {
                const dayName = CZECH_DAYS[dayIdx];

                return (
                  <div key={dayIdx} className="flex gap-1.5 items-center">
                    <span className="w-14 text-xs font-bold text-muted-foreground truncate text-right pr-2">
                      {CZECH_DAYS_SHORT[dayIdx]}
                    </span>

                    {hourlyWeekdayData.hours.map((hour) => {
                      const amount = hourlyWeekdayData.grid ? hourlyWeekdayData.grid[dayIdx][hour] : 0;
                      const orders = hourlyWeekdayData.gridOrders ? hourlyWeekdayData.gridOrders[dayIdx][hour] : 0;
                      const maxVal = hourlyWeekdayData.maxHourlyRevenue;
                      const ratio = maxVal > 0 ? amount / maxVal : 0;

                      let cellBg = "bg-muted/20 border-border/40 text-muted-foreground/30";
                      let glow = "";

                      if (amount > 0) {
                        if (ratio > 0.75) {
                          cellBg = "bg-sky-400 border-sky-300 text-sky-950 font-black";
                          glow = "shadow-[0_0_14px_rgba(56,189,248,0.8)]";
                        } else if (ratio > 0.4) {
                          cellBg = "bg-sky-600 border-sky-400 text-white font-bold";
                          glow = "shadow-[0_0_8px_rgba(56,189,248,0.45)]";
                        } else if (ratio > 0.15) {
                          cellBg = "bg-sky-800 border-sky-600 text-sky-100";
                          glow = "shadow-[0_0_4px_rgba(56,189,248,0.25)]";
                        } else {
                          cellBg = "bg-sky-950/70 border-sky-800 text-sky-300";
                        }
                      }

                      return (
                        <div
                          key={hour}
                          title={`${dayName} ${hour}:00–${hour}:59: ${amount.toFixed(0)} Kč (${orders} prodejů)`}
                          className={cn(
                            "w-12 sm:w-14 h-9 rounded-lg border flex flex-col items-center justify-center text-[10px] select-none transition-all cursor-default",
                            cellBg,
                            glow
                          )}
                        >
                          {amount > 0 ? (
                            <>
                              <span className="font-extrabold leading-tight">{amount.toFixed(0)}</span>
                              <span className="text-[9px] opacity-75">{orders}×</span>
                            </>
                          ) : (
                            <span className="opacity-20">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: POS REGISTER BREAKDOWN (Výkon pokladen) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Výkon jednotlivých pokladen</h2>
        </div>

        {posBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Žádné pokladny v tomto období.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posBreakdown.map((item) => {
              const sharePercent = kpis.totalRevenue > 0 ? (item.totalRevenue / kpis.totalRevenue) * 100 : 0;
              const aov = item.ordersCount > 0 ? item.totalRevenue / item.ordersCount : 0;

              return (
                <div key={item.posName} className="p-4 rounded-2xl border bg-card/60 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base truncate">{item.posName}</span>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {item.ordersCount} prodejů
                    </Badge>
                  </div>

                  <div className="text-3xl font-black text-primary tabular-nums">
                    {item.totalRevenue.toFixed(0)} Kč
                  </div>

                  {/* Progress bar of revenue share */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                      <span>Podíl na tržbě:</span>
                      <span className="font-bold text-foreground">{sharePercent.toFixed(1)} %</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${sharePercent}%` }} />
                    </div>
                  </div>

                  {/* Breakdown details */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Hotově: <strong>{item.cashRevenue.toFixed(0)} Kč</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                      <QrCode className="h-3.5 w-3.5 text-sky-500" />
                      <span>QR: <strong>{item.qrRevenue.toFixed(0)} Kč</strong></span>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex justify-between pt-1">
                    <span>Průměrný nákup:</span>
                    <span className="font-semibold text-foreground">{Math.round(aov)} Kč</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: KATEGORIE & VÝDEJ ZDARMA / SLEVY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Categories Donut Chart */}
        <Card className="border bg-card/60 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-500" />
              Podíl kategorií na obratu
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {categoryShareData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Žádná data</div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryShareData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categoryShareData.map((_, index) => (
                        <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const totalVal = categoryShareData.reduce((acc, curr) => acc + curr.value, 0);
                          const pct = totalVal > 0 ? ((Number(data.value) / totalVal) * 100).toFixed(1) : "0";
                          return (
                            <div className="bg-popover text-popover-foreground border border-border px-3 py-2 rounded-lg shadow-xl text-xs space-y-1">
                              <div className="font-semibold flex items-center gap-2 text-foreground">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: (data.payload as any)?.fill || data.color }}
                                />
                                <span>{data.name}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-muted-foreground text-[11px]">
                                <span>Obrat:</span>
                                <span className="font-bold text-foreground">
                                  {Number(data.value).toFixed(0)} Kč ({pct} %)
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Free Items & Discounts Summary */}
        <Card className="border bg-card/60 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Scissors className="h-4 w-4 text-emerald-500" />
              Položky zdarma & Poskytnuté slevy
            </CardTitle>
            <CardDescription className="text-xs">
              Přehled zboží vydaného za 0 Kč a poskytnutých slev v tomto období.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Vydáno zdarma (0 Kč)</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {kpis.freeItemsCount} <span className="text-sm font-bold">kusů</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Katalogová hodnota darovaného:</div>
                <div className="text-lg font-bold text-foreground">{kpis.freeItemsValue.toFixed(0)} Kč</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Poskytnuté slevy na položkách</div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {kpis.discountsGivenTotal.toFixed(0)} <span className="text-sm font-bold">Kč</span>
                </div>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                Slevové akce
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
