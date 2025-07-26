
"use client";

import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/components/AppProvider';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import DailySchedule from '@/components/calendar/DailySchedule';
import SemesterView from '@/components/calendar/SemesterView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSunday as checkIsSunday } from '@/lib/utils';

export default function CalendarPage() {
    const { attendanceByDate, isLoaded, holidays } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const dailyAttendanceStatus = useMemo(() => {
        const statusByDate: { [key: string]: 'attended' | 'absent' | 'cancelled' | 'postponed' | 'holiday' | 'mixed' } = {};

        for (const [date, records] of attendanceByDate.entries()) {
            if (records.length === 0) continue;

            const hasAbsent = records.some(r => r.status === 'Absent');
            const hasAttended = records.some(r => r.status === 'Attended');

            if (hasAbsent && hasAttended) {
                statusByDate[date] = 'mixed';
            } else if (hasAbsent) {
                statusByDate[date] = 'absent';
            } else if (hasAttended) {
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
    
    const mixedModifier = useCallback((date: Date) => {
        return dailyAttendanceStatus[format(date, 'yyyy-MM-dd')] === 'mixed';
    }, [dailyAttendanceStatus]);

    const holidayModifier = useCallback((date: Date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        return holidays.includes(dateString) || checkIsSunday(dateString);
    }, [holidays]);


    const modifiers = useMemo(() => ({
        attended: attendedModifier,
        absent: absentModifier,
        cancelled: cancelledModifier,
        postponed: postponedModifier,
        mixed: mixedModifier,
        holiday: holidayModifier,
    }), [attendedModifier, absentModifier, cancelledModifier, postponedModifier, mixedModifier, holidayModifier]);

    const modifierStyles = {
        attended: { 
            backgroundColor: 'hsla(var(--chart-2), 0.3)',
        },
        absent: {
            backgroundColor: 'hsla(var(--destructive), 0.2)',
        },
        mixed: {
            background: 'linear-gradient(135deg, hsla(var(--chart-2), 0.3) 50%, hsla(var(--destructive), 0.2) 50%)',
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
    };

    if (!isLoaded) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h2>
                    <Skeleton className="h-10 w-40" />
                </div>
                <Skeleton className="h-[365px] w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Tabs defaultValue="monthly" className="w-full space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h2>
                    <TabsList>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        <TabsTrigger value="semester">Semester</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="monthly" className="space-y-6">
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
                </TabsContent>
                <TabsContent value="semester">
                    <SemesterView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
