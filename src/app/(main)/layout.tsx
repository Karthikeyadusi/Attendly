
"use client";

import { AppProvider } from "@/components/AppProvider";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsClient } from "@/hooks/useIsClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="flex h-screen w-full">
        <Skeleton className="hidden w-64 flex-shrink-0 md:block" />
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-16 w-full" />
          <div className="flex-1 p-6">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      {isMobile ? (
         <div className="relative flex h-screen w-full flex-col max-w-lg bg-background shadow-lg">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 pb-20">{children}</main>
          <BottomNav />
        </div>
      ) : (
        <div className="flex h-screen w-full">
            <DesktopSidebar />
            <div className="flex flex-1 flex-col">
              <Header />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
      )}
    </AppProvider>
  );
}
