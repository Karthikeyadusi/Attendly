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
  // Always initialize with default values to prevent hydration mismatch.
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mode, setModeState] = useState<Mode>(defaultMode);

  // This effect runs only on the client, after the initial render.
  // It safely reads the user's preference from localStorage and updates the state.
  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem(storageKey);
      if (storedConfig) {
        const { theme: storedTheme, mode: storedMode } = JSON.parse(storedConfig);
        if (storedTheme && THEMES.includes(storedTheme)) {
          setThemeState(storedTheme);
        }
        if (storedMode && ['light', 'dark'].includes(storedMode)) {
          setModeState(storedMode);
        }
      }
    } catch (e) {
      console.error('Failed to parse theme from local storage');
    }
  }, [storageKey]);

  // This effect syncs the state back to the DOM and localStorage.
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
