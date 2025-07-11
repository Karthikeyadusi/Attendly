
"use client";

import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/components/AppProvider';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import DailySchedule from '@/components/calendar/DailySchedule';
import { isSunday as checkIsSunday } from '@/lib/utils';

export default function CalendarPage() {
    const { attendanceByDate, isLoaded, holidays } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const dailyAttendanceStatus = useMemo(() => {
        const statusByDate: { [key: string]: 'attended' | 'absent' | 'cancelled' | 'postponed' | 'holiday' } = {};

        for (const [date, records] of attendanceByDate.entries()) {
            if (records.length === 0) continue;

            if (records.some(r => r.status === 'Absent')) {
                statusByDate[date] = 'absent';
            } else if (records.some(r => r.status === 'Attended')) {
                statusByDate[date] = 'attended';
            } else if (records.some(r => r.status === 'Postponed')) {
                statusByDate[date] = 'postponed';
            } else if (records.every(r => r.status === 'Cancelled')) {
                statusByDate[date] = 'cancelled';
            }
        }
        return statusByDate;
    }, [attendanceByDate]);
    
    const attendedModifier = useCallback((date: Date) => {
        return dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'attended';
    }, [dailyAttendanceStatus]);

    const absentModifier = useCallback((date: Date) => {
        return dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'absent';
    }, [dailyAttendanceStatus]);
    
    const cancelledModifier = useCallback((date: Date) => {
        return dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'cancelled';
    }, [dailyAttendanceStatus]);

    const postponedModifier = useCallback((date: Date) => {
        return dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'postponed';
    }, [dailyAttendanceStatus]);

    const holidayModifier = useCallback((date: Date) => {
        return holidays.includes(format(date, 'yyyy-MM-dd'));
    }, [holidays]);

    const isSunday = useCallback((date: Date) => {
        return checkIsSunday(format(date, 'yyyy-MM-dd'));
    }, []);


    const modifiers = useMemo(() => ({
        attended: attendedModifier,
        absent: absentModifier,
        cancelled: cancelledModifier,
        postponed: postponedModifier,
        holiday: holidayModifier,
        sunday: isSunday
    }), [attendedModifier, absentModifier, cancelledModifier, postponedModifier, holidayModifier, isSunday]);

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
        postponed: {
            backgroundColor: 'hsla(var(--chart-4), 0.2)',
        },
        holiday: {
            backgroundColor: 'hsla(var(--primary), 0.2)',
            color: 'hsl(var(--primary))'
        },
        sunday: {
            backgroundColor: 'hsla(var(--destructive), 0.1)',
            color: 'hsl(var(--destructive))'
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
