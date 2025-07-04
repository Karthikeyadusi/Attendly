"use client";

import React, { createContext, useContext } from 'react';
import { useAppData } from '@/hooks/useAppData';

type AppContextType = ReturnType<typeof useAppData>;

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const appData = useAppData();
  return <AppContext.Provider value={appData}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
