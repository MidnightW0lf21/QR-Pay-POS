'use client';

import React from 'react';
import { useDataContext } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Wifi, WifiOff, RefreshCw, HardDrive, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncStatusBadgeProps {
  onOpenAuth: () => void;
  className?: string;
}

export default function SyncStatusBadge({ onOpenAuth, className }: SyncStatusBadgeProps) {
  const { syncStatus, isCloudConnected } = useDataContext();
  const { user } = useAuth();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onOpenAuth}
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-sm cursor-pointer",
              syncStatus === 'online' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 dark:text-emerald-400",
              syncStatus === 'syncing' && "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20 dark:text-blue-400",
              syncStatus === 'offline' && "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 dark:text-amber-400",
              syncStatus === 'local-only' && "bg-muted text-muted-foreground border-border hover:bg-muted/80",
              className
            )}
          >
            {syncStatus === 'online' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">Online</span>
              </>
            )}

            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                <span className="hidden sm:inline">Synchronizuji...</span>
              </>
            )}

            {syncStatus === 'offline' && (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" />
                <span className="hidden sm:inline">Offline (Uloženo)</span>
              </>
            )}

            {syncStatus === 'local-only' && (
              <>
                <HardDrive className="h-3 w-3" />
                <span className="hidden sm:inline">Lokální data</span>
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs">
          {syncStatus === 'online' && (
            <p>🟢 Pokladna je online a v reálném čase propojena s ostatními pokladnami ({user?.email}).</p>
          )}
          {syncStatus === 'syncing' && (
            <p>🔄 Probíhá odesílání offline změn do databáze.</p>
          )}
          {syncStatus === 'offline' && (
            <p>🟡 Jste offline. Všechny prodeje se ukládají lokálně v zařízení a odešlou se ihned po připojení k internetu.</p>
          )}
          {syncStatus === 'local-only' && (
            <p>Klikněte pro přihlášení a zapnutí online synchronizace.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
