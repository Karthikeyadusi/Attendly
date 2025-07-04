import { AppProvider } from "@/components/AppProvider";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <div className="relative flex h-screen w-full flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 p-4">{children}</main>
        <BottomNav />
      </div>
    </AppProvider>
  );
}
