"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['Navy', 'Zinc', 'Forest', 'Rose'] as const;
export type Theme = typeof THEMES[number];
type Mode = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultMode?: Mode;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: Mode;
  toggleMode: () => void;
};

const initialState: ThemeProviderState = {
  theme: 'Navy',
  setTheme: () => null,
  mode: 'dark',
  toggleMode: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'Navy',
  defaultMode = 'dark',
  storageKey = 'attendly-theme-config',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme;
    }
    try {
      const storedConfig = localStorage.getItem(storageKey);
      if (storedConfig) {
        const { theme: storedTheme } = JSON.parse(storedConfig);
        if (storedTheme && THEMES.includes(storedTheme)) {
          return storedTheme;
        }
      }
    } catch (e) {
      console.error('Failed to parse theme from local storage');
    }
    return defaultTheme;
  });

  const [mode, setModeState] = useState<Mode>(() => {
     if (typeof window === 'undefined') {
      return defaultMode;
    }
    try {
      const storedConfig = localStorage.getItem(storageKey);
      if (storedConfig) {
        const { mode: storedMode } = JSON.parse(storedConfig);
        if (storedMode && ['light', 'dark'].includes(storedMode)) {
          return storedMode;
        }
      }
    } catch (e) {
      console.error('Failed to parse mode from local storage');
    }
    return defaultMode;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    root.classList.add(mode);

    const themeClasses = THEMES.map(t => `theme-${t.toLowerCase()}`);
    root.classList.remove(...themeClasses);
    
    root.classList.add(`theme-${theme.toLowerCase()}`);
    
    localStorage.setItem(storageKey, JSON.stringify({ theme, mode }));
  }, [theme, mode, storageKey]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const toggleMode = () => {
    setModeState((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme,
    setTheme,
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
