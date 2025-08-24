
"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookCheck, Library, CalendarOff, Star, Info } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { isSunday } from "@/lib/utils";

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
    const { attendance, subjects, timetable, minAttendancePercentage, historicalData, trackingStartDate, isLoaded, holidays, oneOffSlots } = useApp();

    const stats = useMemo(() => {
        if (!isLoaded) {
          return { totalAttendedCredits: 0, totalConductedCredits: 0, cancelledCount: 0, attendancePercentage: 0, safeMissValue: 0 };
        }

        const allSlots = [...timetable, ...oneOffSlots];
        const slotMap = new Map(allSlots.map(s => [s.id, s]));
        
        // Historical data is already in credits
        const historicalConductedCredits = historicalData?.conductedCredits ?? 0;
        const historicalAttendedCredits = historicalData?.attendedCredits ?? 0;

        // Filter daily records based on start date and holidays
        const dailyRecords = attendance.filter(r => {
            if (trackingStartDate && r.date < trackingStartDate) return false;
            if (holidays.includes(r.date) || isSunday(r.date)) return false;
            return true;
        });

        let dailyAttendedCredits = 0;
        let dailyConductedCredits = 0;
        const dailyCancelledCount = dailyRecords.filter(r => r.status === 'Cancelled').length;
        
        for (const record of dailyRecords) {
            if (record.status === 'Cancelled' || record.status === 'Postponed') continue;

            const slot = slotMap.get(record.slotId);
            if (!slot) continue;
            
            const credits = slot.credits;
            dailyConductedCredits += credits;
            if (record.status === 'Attended') {
                dailyAttendedCredits += credits;
            }
        }
        
        const totalConductedCredits = historicalConductedCredits + dailyConductedCredits;
        const totalAttendedCredits = historicalAttendedCredits + dailyAttendedCredits;
        
        const attendancePercentage = totalConductedCredits > 0 ? (totalAttendedCredits / totalConductedCredits) * 100 : 100;
        
        const safeToMiss = () => {
          // Average credits per class is needed to convert the final number back to classes for the message.
          const uniqueSlotsInTimetable = [...new Map(timetable.map(item => [item.id, item])).values()];
          const totalCreditsInTimetable = uniqueSlotsInTimetable.reduce((acc, slot) => acc + slot.credits, 0);
          const avgCreditsPerClass = totalCreditsInTimetable > 0 ? totalCreditsInTimetable / uniqueSlotsInTimetable.length : 1;
          
          const minRatio = minAttendancePercentage / 100;
          if (attendancePercentage < minAttendancePercentage) {
            if (1 - minRatio <= 0) return 'N/A'; // Avoid division by zero if min attendance is 100%
            const creditsNeeded = Math.ceil(((minRatio * totalConductedCredits) - totalAttendedCredits) / (1 - minRatio));
            const classesNeeded = Math.ceil(creditsNeeded / avgCreditsPerClass);
            if (classesNeeded <= 0) return null;
            return `Attend ${classesNeeded} more class${classesNeeded !== 1 ? 'es' : ''}`;
          }
          if(minRatio <= 0) return 'Infinite'; // Avoid division by zero if min attendance is 0%
          const creditsCanMiss = Math.floor((totalAttendedCredits - minRatio * totalConductedCredits) / minRatio);
          const classesCanMiss = Math.floor(creditsCanMiss / avgCreditsPerClass);
          return classesCanMiss;
        };

        const safeMissValue = safeToMiss();

        return {
            totalAttendedCredits,
            totalConductedCredits,
            cancelledCount: dailyCancelledCount,
            attendancePercentage,
            safeMissValue,
        };
    }, [attendance, timetable, oneOffSlots, historicalData, trackingStartDate, minAttendancePercentage, isLoaded, holidays]);

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

    const progressColor = stats.attendancePercentage >= minAttendancePercentage ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle>Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={stats.attendancePercentage} indicatorClassName={stats.attendancePercentage < minAttendancePercentage ? 'bg-destructive' : undefined} />
                    <p className="text-lg font-bold text-center" style={{ color: progressColor }}>
                        {stats.attendancePercentage.toFixed(2)}%
                    </p>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
               <StatCard title="Attended Credits" value={stats.totalAttendedCredits} icon={BookCheck} />
               <StatCard title="Conducted Credits" value={stats.totalConductedCredits} icon={Library} />
               <StatCard title="Cancelled Classes" value={stats.cancelledCount} icon={CalendarOff} />
               <StatCard 
                 title="Safe to Miss (Classes)" 
                 value={typeof stats.safeMissValue === 'number' ? stats.safeMissValue : 'N/A'} 
                 icon={Star}
                 tooltipContent={
                    <p className="max-w-xs text-sm">
                        Shows how many classes you can skip and still meet your attendance goal. If you're below the goal, a message will appear below this card.
                    </p>
                 }
                />
            </div>
            {typeof stats.safeMissValue === 'string' && (
                <p className="text-sm text-center text-amber-500">{stats.safeMissValue}</p>
            )}
        </div>
    );
}
