
'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

type PaymentMode = 'cash' | 'qr';

interface AppContextType {
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');

  const value = useMemo(() => ({ paymentMode, setPaymentMode }), [paymentMode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
