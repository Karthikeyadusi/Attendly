
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookCopy, Calendar, CalendarDays, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/subjects", label: "Subjects", icon: BookCopy },
];

const bottomItems = [
    { href: "/settings", label: "Settings", icon: Settings },
];

export default function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
             <div className="flex items-center gap-2">
                <Logo className="h-7 w-7 text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Attendly</h1>
            </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-colors",
                    isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
                >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                </Link>
            );
            })}
        </nav>
        <div className="p-4 mt-auto border-t">
             {bottomItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-colors",
                        isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    )}
                    >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    </Link>
                );
            })}
        </div>
    </aside>
  );
}
