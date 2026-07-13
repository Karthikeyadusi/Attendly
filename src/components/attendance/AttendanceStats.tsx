
"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookCheck, Library, CalendarOff, Star, Info } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { computeOverallStats } from "@/lib/attendanceEngine";

const StatCard = ({ title, value, icon: Icon, color, tooltipContent }: { title: string, value: string | number, icon: React.ElementType, color?: string, tooltipContent?: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {tooltipContent && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                {tooltipContent}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        </CardContent>
    </Card>
);

export default function AttendanceStats() {
    const {
        attendance,
        subjects,
        timetable,
        oneOffSlots,
        minAttendancePercentage,
        historicalData,
        trackingStartDate,
        isLoaded,
        holidays,
        subjectStats,
    } = useApp();

    const stats = useMemo(() => {
        if (!isLoaded) {
            return { totalAttendedCredits: 0, totalConductedCredits: 0, cancelledCount: 0, percentage: 0, safeMissClasses: 0, classesNeeded: 0 };
        }
        const allSlots = [...timetable, ...oneOffSlots];
        return computeOverallStats(
            subjectStats,
            historicalData,
            allSlots,
            attendance,
            trackingStartDate,
            holidays || [],
            minAttendancePercentage
        );
    }, [subjectStats, historicalData, timetable, oneOffSlots, attendance, trackingStartDate, holidays, minAttendancePercentage, isLoaded]);

    if (!isLoaded) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      )
    }

    const progressColor = stats.percentage >= minAttendancePercentage ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

    // Build the safe-miss / recovery label
    let safeMissDisplay: string | number = stats.safeMissClasses;
    let helperMessage: string | null = null;
    if (stats.percentage < minAttendancePercentage && stats.classesNeeded > 0) {
        safeMissDisplay = 'N/A';
        helperMessage = `Attend ${stats.classesNeeded} more class${stats.classesNeeded !== 1 ? 'es' : ''} to reach ${minAttendancePercentage}%`;
    }

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={stats.percentage} indicatorClassName={stats.percentage < minAttendancePercentage ? 'bg-destructive' : undefined} />
                    <p className="text-lg font-bold text-center" style={{ color: progressColor }}>
                        {stats.percentage.toFixed(2)}%
                    </p>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
               <StatCard title="Attended Credits" value={stats.totalAttendedCredits} icon={BookCheck} />
               <StatCard title="Conducted Credits" value={stats.totalConductedCredits} icon={Library} />
               <StatCard title="Cancelled Classes" value={stats.cancelledCount} icon={CalendarOff} />
               <StatCard
                 title="Safe to Miss (Classes)"
                 value={safeMissDisplay}
                 icon={Star}
                 tooltipContent={
                    <p className="max-w-xs text-sm">
                        Shows how many classes you can skip and still meet your attendance goal. If you're below the goal, a message will appear below this card.
                    </p>
                 }
                />
            </div>
            {helperMessage && (
                <p className="text-sm text-center text-amber-500">{helperMessage}</p>
            )}
        </div>
    );
}
