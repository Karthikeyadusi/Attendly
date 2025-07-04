"use client";

import TodaysClasses from "@/components/attendance/TodaysClasses";
import AttendanceStats from "@/components/attendance/AttendanceStats";
import { useApp } from "@/components/AppProvider";
import Onboarding from "@/components/Onboarding";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { subjects, timetable, isLoaded } = useApp();

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
    return <Onboarding />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
      <AttendanceStats />
      <TodaysClasses />
    </div>
  );
}
