
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, Settings, History } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export default function Header() {
  const { paymentMode } = useAppContext();

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm transition-colors duration-300",
      paymentMode === 'cash' ? "bg-success/80 border-success/30" : "bg-primary/80 border-primary/30"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between max-w-7xl">
        <Link href="/" className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary-foreground" />
          <span className={cn(
            "text-xl font-bold text-primary-foreground"
          )}>Quick Pay</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/history" passHref>
            <Button variant="ghost" size="icon" className={cn("text-primary-foreground hover:bg-primary-foreground/10")}>
              <History className="h-5 w-5" />
              <span className="sr-only">Historie</span>
            </Button>
          </Link>
          <Link href="/settings" passHref>
            <Button variant="ghost" size="icon" className={cn("text-primary-foreground hover:bg-primary-foreground/10")}>
              <Settings className="h-5 w-5" />
              <span className="sr-only">Nastavení</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
