
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, Settings, History, User } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useDataContext } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import SyncStatusBadge from "./sync-status-badge";
import AuthModal from "./auth-modal";

export default function Header() {
  const { paymentMode } = useAppContext();
  const { posName } = useDataContext();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm transition-colors duration-300",
        paymentMode === 'cash' ? "bg-success/80 border-success/30" : "bg-primary/80 border-primary/30"
      )}>
        <div className="container mx-auto flex h-16 items-center justify-between max-w-7xl px-4 gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Store className="h-6 w-6 shrink-0 text-primary-foreground" />
            <span className={cn(
              "text-lg sm:text-xl font-bold text-primary-foreground truncate"
            )}>
              {posName || "Quick Pay"}
            </span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <SyncStatusBadge onOpenAuth={() => setIsAuthModalOpen(true)} />

            <Button
              variant="ghost"
              size="icon"
              className={cn("text-primary-foreground hover:bg-primary-foreground/10")}
              onClick={() => setIsAuthModalOpen(true)}
              title={user ? `Přihlášen: ${user.email}` : "Přihlásit pokladnu"}
            >
              <User className="h-5 w-5" />
              <span className="sr-only">Účet</span>
            </Button>

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

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
