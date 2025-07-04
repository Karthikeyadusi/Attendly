"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookCheck, BookX, CalendarOff, Star } from 'lucide-react';
import { useMemo } from 'react';

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
    const { attendance, minAttendancePercentage } = useApp();

    const stats = useMemo(() => {
        const attendedRecords = attendance.filter(r => r.status === 'Attended');
        const absentRecords = attendance.filter(r => r.status === 'Absent');
        const cancelledRecords = attendance.filter(r => r.status === 'Cancelled');

        const attendedCredits = attendedRecords.reduce((sum, r) => sum + r.credits, 0);
        const absentCredits = absentRecords.length > 0 ? absentRecords.reduce((sum, r, index) => {
          const originalRecord = attendance.find(ar => ar.id === r.id);
          // This is a rough estimation of credits for missed classes as they are stored with 0.
          // Assuming all classes are 2 credits for simplicity.
          return sum + 2; 
        }, 0) : 0;
        
        const totalScheduledCredits = attendedCredits + absentCredits;
        const attendancePercentage = totalScheduledCredits > 0 ? (attendedCredits / totalScheduledCredits) * 100 : 100;

        const safeToMiss = () => {
          if (attendancePercentage < minAttendancePercentage) {
            const neededCredits = (minAttendancePercentage / 100 * totalScheduledCredits) - attendedCredits;
            // Assuming 2 credits per class
            return `${Math.ceil(neededCredits / 2)} more classes to attend to reach ${minAttendancePercentage}%`;
          }
          const bunksAvailable = Math.floor((attendedCredits - (minAttendancePercentage / 100) * totalScheduledCredits) / ((minAttendancePercentage / 100) * 2));
          return bunksAvailable;
        };
        
        const safeMissValue = safeToMiss();

        return {
            attendedCount: attendedRecords.length,
            absentCount: absentRecords.length,
            cancelledCount: cancelledRecords.length,
            attendancePercentage,
            safeMissValue,
        };
    }, [attendance, minAttendancePercentage]);

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
