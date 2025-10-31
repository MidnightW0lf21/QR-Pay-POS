
'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

type PaymentMode = 'cash' | 'qr';
type ColumnView = '2-col' | '3-col';

const COLUMN_VIEW_STORAGE_KEY = 'qr-pay-column-view';

interface AppContextType {
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;
  columnView: ColumnView;
  setColumnView: (view: ColumnView) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [columnView, setColumnView] = useState<ColumnView>('2-col');

  useEffect(() => {
    const storedColumnView = localStorage.getItem(COLUMN_VIEW_STORAGE_KEY) as ColumnView;
    if (storedColumnView) {
      setColumnView(storedColumnView);
    }
  }, []);

  const handleSetColumnView = (view: ColumnView) => {
    setColumnView(view);
    localStorage.setItem(COLUMN_VIEW_STORAGE_KEY, view);
  };

  const value = useMemo(() => ({ 
    paymentMode, 
    setPaymentMode,
    columnView,
    setColumnView: handleSetColumnView,
  }), [paymentMode, columnView]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

    