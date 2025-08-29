
"use client";

import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../Logo';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Header() {
  const isMobile = useIsMobile();

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
      <ThemeToggle />
    </header>
  );
}
