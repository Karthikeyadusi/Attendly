
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import DailySchedule from '@/components/calendar/DailySchedule';

export default function CalendarPage() {
    const { attendanceByDate, isLoaded } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const dailyAttendanceStatus = useMemo(() => {
        if (!isLoaded) return {};
        const statusByDate: { [key: string]: 'attended' | 'absent' | 'cancelled' } = {};

        for (const [date, records] of attendanceByDate.entries()) {
            const allCancelled = records.every(r => r.status === 'Cancelled');
            if (allCancelled && records.length > 0) {
                 statusByDate[date] = 'cancelled';
                 continue;
            }
            if (records.some(r => r.status === 'Absent')) {
                statusByDate[date] = 'absent';
            } else if (records.every(r => r.status === 'Attended' || r.status === 'Cancelled')) {
                if (records.some(r => r.status === 'Attended')) {
                    statusByDate[date] = 'attended';
                }
            }
        }
        return statusByDate;
    }, [attendanceByDate, isLoaded]);

    const modifiers = useMemo(() => ({
        attended: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'attended',
        absent: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'absent',
        cancelled: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'cancelled',
    }), [dailyAttendanceStatus]);

    const modifierStyles = {
        attended: { 
            backgroundColor: 'hsla(var(--chart-2), 0.2)',
        },
        absent: {
            backgroundColor: 'hsla(var(--destructive), 0.2)',
        },
        cancelled: {
            backgroundColor: 'hsl(var(--muted))',
        },
    };

    if (!isLoaded) {
        return (
            <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h2>
                <Skeleton className="h-[365px] w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h2>
            <Card className="flex justify-center p-0 sm:p-4">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    modifiers={modifiers}
                    modifiersStyles={modifierStyles}
                />
            </Card>

            <DailySchedule selectedDate={selectedDate} />
        </div>
    );
}
