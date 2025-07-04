
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import type { AttendanceRecord } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import DailySchedule from '@/components/calendar/DailySchedule';

export default function CalendarPage() {
    const { attendance, isLoaded } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const attendanceByDate = useMemo(() => {
        if (!isLoaded) return new Map<string, AttendanceRecord[]>();
        
        return attendance.reduce((acc, record) => {
            const records = acc.get(record.date) || [];
            records.push(record);
            acc.set(record.date, records);
            return acc;
        }, new Map<string, AttendanceRecord[]>());
    }, [attendance, isLoaded]);

    const dailyAttendanceStatus = useMemo(() => {
        if (!isLoaded) return {};
        const statusByDate: { [key: string]: 'attended' | 'absent' | 'cancelled' } = {};

        for (const [date, records] of attendanceByDate.entries()) {
            const allCancelled = records.every(r => r.status === 'Cancelled');
            if (allCancelled && records.length > 0) {
                 statusByDate[date] = 'cancelled';
                 continue;
            }
            const statuses = new Set(records.map(r => r.status));
            if (statuses.has('Absent')) {
                statusByDate[date] = 'absent';
            } else if (statuses.has('Attended')) {
                statusByDate[date] = 'attended';
            }
        }
        return statusByDate;
    }, [attendanceByDate, isLoaded]);

    const modifiers = {
        attended: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'attended',
        absent: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'absent',
        cancelled: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'cancelled',
    };

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
            <Card className="flex justify-center">
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
