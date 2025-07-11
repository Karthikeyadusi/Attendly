"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookCopy, Calendar, CalendarDays, Home, Settings, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/solver", label: "Solver", icon: BrainCircuit },
  { href: "/subjects", label: "Subjects", icon: BookCopy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg border-t bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md p-2 text-xs transition-colors w-16",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-center truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
