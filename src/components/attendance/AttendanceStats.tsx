"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookCheck, Library, CalendarOff, Star } from 'lucide-react';
import { useMemo } from 'react';
import { Skeleton } from "../ui/skeleton";

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        </CardContent>
    </Card>
);

export default function AttendanceStats() {
    const { attendance, subjects, timetable, minAttendancePercentage, historicalData, trackingStartDate, isLoaded } = useApp();

    const stats = useMemo(() => {
        if (!isLoaded || subjects.length === 0) {
          return { totalAttendedCredits: 0, totalConductedCredits: 0, cancelledCount: 0, attendancePercentage: 0, safeMissValue: 0 };
        }

        const subjectMap = new Map(subjects.map(s => [s.id, s]));

        // Calculate credits from historical data
        const historicalConductedCredits = historicalData.reduce((sum, r) => {
            const subject = subjectMap.get(r.subjectId);
            return sum + (r.conducted * (subject?.credits ?? 0));
        }, 0);
        const historicalAttendedCredits = historicalData.reduce((sum, r) => {
            const subject = subjectMap.get(r.subjectId);
            return sum + (r.attended * (subject?.credits ?? 0));
        }, 0);

        // Filter daily records based on start date
        const dailyRecords = trackingStartDate
            ? attendance.filter(r => r.date >= trackingStartDate)
            : attendance;

        const slotMap = new Map(timetable.map(s => [s.id, s]));

        let dailyAttendedCredits = 0;
        let dailyConductedCredits = 0;
        const dailyCancelledCount = dailyRecords.filter(r => r.status === 'Cancelled').length;

        for (const record of dailyRecords) {
            if (record.status === 'Cancelled') continue;

            const slot = slotMap.get(record.slotId);
            if (!slot) continue;
            
            const subject = subjectMap.get(slot.subjectId);
            if (!subject) continue;

            const credits = subject.credits;
            dailyConductedCredits += credits;
            if (record.status === 'Attended') {
                dailyAttendedCredits += credits;
            }
        }
        
        const totalConductedCredits = historicalConductedCredits + dailyConductedCredits;
        const totalAttendedCredits = historicalAttendedCredits + dailyAttendedCredits;
        
        const attendancePercentage = totalConductedCredits > 0 ? (totalAttendedCredits / totalConductedCredits) * 100 : 100;
        
        const safeToMiss = () => {
          const minRatio = minAttendancePercentage / 100;
          if (attendancePercentage < minAttendancePercentage) {
            if (1 - minRatio <= 0) return 'N/A';
            const creditsNeeded = Math.ceil(((minRatio * totalConductedCredits) - totalAttendedCredits) / (1 - minRatio));
            return `Attend ${creditsNeeded} more credits`;
          }
          if(minRatio <= 0) return 'Infinite';
          const creditsCanMiss = Math.floor((totalAttendedCredits - minRatio * totalConductedCredits) / minRatio);
          return creditsCanMiss;
        };

        const safeMissValue = safeToMiss();

        return {
            totalAttendedCredits,
            totalConductedCredits,
            cancelledCount: dailyCancelledCount,
            attendancePercentage,
            safeMissValue,
        };
    }, [attendance, subjects, timetable, historicalData, trackingStartDate, minAttendancePercentage, isLoaded]);

    if (!isLoaded) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <Progress value={stats.attendancePercentage} style={{'--primary': progressColor } as React.CSSProperties} />
                    <p className="text-lg font-bold text-center" style={{ color: progressColor }}>
                        {stats.attendancePercentage.toFixed(2)}%
                    </p>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
               <StatCard title="Attended Credits" value={stats.totalAttendedCredits} icon={BookCheck} />
               <StatCard title="Conducted Credits" value={stats.totalConductedCredits} icon={Library} />
               <StatCard title="Cancelled Classes" value={stats.cancelledCount} icon={CalendarOff} />
               <StatCard title="Safe Miss (Credits)" value={typeof stats.safeMissValue === 'number' ? stats.safeMissValue : 'N/A'} icon={Star} />
            </div>
            {typeof stats.safeMissValue === 'string' && (
                <p className="text-sm text-center text-amber-500">{stats.safeMissValue}</p>
            )}
        </div>
    );
}
