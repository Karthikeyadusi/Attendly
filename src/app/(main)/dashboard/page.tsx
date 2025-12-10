
"use client";

import TodaysClasses from "@/components/attendance/TodaysClasses";
import AttendanceStats from "@/components/attendance/AttendanceStats";
import { useApp } from "@/components/AppProvider";
import Onboarding from "@/components/Onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, Cloud, RefreshCw, CloudOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SyncStatus } from "@/types";

const SyncIndicator = ({ status }: { status: SyncStatus }) => {
    const config = {
        idle: { Icon: Cloud, color: 'text-muted-foreground', label: 'Sync Idle' },
        syncing: { Icon: RefreshCw, color: 'text-blue-500 animate-spin', label: 'Syncing...' },
        synced: { Icon: Cloud, color: 'text-green-500', label: 'Up to Date' },
        offline: { Icon: CloudOff, color: 'text-muted-foreground', label: 'Offline' },
        error: { Icon: AlertCircle, color: 'text-destructive', label: 'Sync Error' },
    };
    const { Icon, color, label } = config[status];

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Icon className={`h-5 w-5 ${color}`} />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


export default function DashboardPage() {
  const { subjects, timetable, isLoaded, userName, user, syncStatus } = useApp();

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
      {user ? (
         <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-2.5 rounded-full">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Cloud Sync Status</h3>
                <p className="text-muted-foreground text-sm capitalize">{syncStatus}</p>
              </div>
            </div>
            <SyncIndicator status={syncStatus} />
          </CardContent>
        </Card>
      ) : (
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
