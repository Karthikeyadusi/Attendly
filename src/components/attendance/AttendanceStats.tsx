"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookCheck, BookX, CalendarOff, Star } from 'lucide-react';
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
    const { attendance, minAttendancePercentage, historicalData, trackingStartDate, isLoaded } = useApp();

    const stats = useMemo(() => {
        if (!isLoaded) {
          return { attendedCount: 0, absentCount: 0, cancelledCount: 0, attendancePercentage: 0, safeMissValue: 0 };
        }

        const historicalConducted = historicalData.reduce((sum, r) => sum + r.conducted, 0);
        const historicalAttended = historicalData.reduce((sum, r) => sum + r.attended, 0);

        const dailyRecords = trackingStartDate
            ? attendance.filter(r => r.date >= trackingStartDate)
            : attendance;

        const dailyAttendedCount = dailyRecords.filter(r => r.status === 'Attended').length;
        const dailyAbsentCount = dailyRecords.filter(r => r.status === 'Absent').length;
        const dailyCancelledCount = dailyRecords.filter(r => r.status === 'Cancelled').length;

        const dailyConductedCount = dailyAttendedCount + dailyAbsentCount;
        
        const totalConducted = historicalConducted + dailyConductedCount;
        const totalAttended = historicalAttended + dailyAttendedCount;
        
        const totalAbsences = (historicalConducted - historicalAttended) + dailyAbsentCount;

        const attendancePercentage = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100;
        
        const safeToMiss = () => {
          if (attendancePercentage < minAttendancePercentage) {
            if (100 - minAttendancePercentage <= 0) return 'N/A';
            const needed = Math.ceil(((minAttendancePercentage / 100) * totalConducted - totalAttended) / (1 - minAttendancePercentage / 100));
            return `Attend ${needed} more`;
          }
          const canMiss = Math.floor((totalAttended - (minAttendancePercentage / 100) * totalConducted) / (minAttendancePercentage / 100));
          return canMiss;
        };

        const safeMissValue = safeToMiss();

        return {
            attendedCount: totalAttended,
            absentCount: totalAbsences,
            cancelledCount: dailyCancelledCount,
            attendancePercentage,
            safeMissValue,
        };
    }, [attendance, historicalData, trackingStartDate, minAttendancePercentage, isLoaded]);

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
               <StatCard title="Attended" value={stats.attendedCount} icon={BookCheck} />
               <StatCard title="Absent" value={stats.absentCount} icon={BookX} />
               <StatCard title="Cancelled" value={stats.cancelledCount} icon={CalendarOff} />
               <StatCard title="Safe to Miss" value={typeof stats.safeMissValue === 'number' ? stats.safeMissValue : 'N/A'} icon={Star} />
            </div>
            {typeof stats.safeMissValue === 'string' && (
                <p className="text-sm text-center text-amber-500">{stats.safeMissValue}</p>
            )}
        </div>
    );
}
