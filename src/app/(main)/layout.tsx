
"use client";

import { AppProvider } from "@/components/AppProvider";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

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
