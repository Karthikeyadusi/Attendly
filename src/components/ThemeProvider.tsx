"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Mode = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultMode?: Mode;
  storageKey?: string;
};

type ThemeProviderState = {
  mode: Mode;
  toggleMode: () => void;
};

const initialState: ThemeProviderState = {
  mode: 'dark',
  toggleMode: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultMode = 'dark',
  storageKey = 'attendly-theme-mode',
}: ThemeProviderProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(storageKey) as Mode | null;
      if (storedMode) {
        setMode(storedMode);
      }
    } catch (e) {
      console.error('Failed to parse theme mode from local storage');
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    
    localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const value = {
    mode,
    toggleMode,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
