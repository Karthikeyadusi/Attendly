
"use client";

import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../Logo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApp } from '../AppProvider';
import { CloudOff } from 'lucide-react';

export default function Header() {
  const isMobile = useIsMobile();
  const { isOnline } = useApp();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
      {isMobile ? (
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Attendly</h1>
        </div>
      ) : (
        // Empty div to keep the theme toggle on the right
        <div />
      )}
      <div className="flex items-center gap-2">
        {!isOnline && (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <CloudOff className="h-4 w-4" />
                <span>Offline</span>
            </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
