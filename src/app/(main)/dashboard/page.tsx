
"use client";

import TodaysClasses from "@/components/attendance/TodaysClasses";
import AttendanceStats from "@/components/attendance/AttendanceStats";
import { useApp } from "@/components/AppProvider";
import Onboarding from "@/components/Onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { subjects, timetable, isLoaded, userName, user } = useApp();

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (subjects.length === 0 || timetable.length === 0) {
    return (
      <div className="flex flex-1 items-center">
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!user && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <LogIn className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">First, Secure Your Data!</h3>
                  <p className="text-muted-foreground text-sm">
                    Sign in to back up your progress and sync across devices.
                  </p>
                </div>
              </div>
              <Link href="/settings" className="w-full sm:w-auto flex-shrink-0">
                <Button className="w-full">Sign In with Google</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
        {userName ? `Welcome, ${userName}!` : 'Dashboard'}
      </h2>
      <AttendanceStats />
      <TodaysClasses />
    </div>
  );
}
