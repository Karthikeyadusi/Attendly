
"use client";

import React, { useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, getDaysInMonth, isSameDay } from 'date-fns';
import { cn, isSunday as checkIsSunday } from '@/lib/utils';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SemesterView() {
    const { attendance, holidays, trackingStartDate, subjectMap, getScheduleForDate } = useApp();

    const dateRange = useMemo(() => {
        if (!attendance.length && !trackingStartDate) {
            return { start: new Date(), end: new Date() };
        }
        
        const dates = attendance.map(a => new Date(a.date.replace(/-/g, '/')));
        if (trackingStartDate) {
            dates.push(new Date(trackingStartDate.replace(/-/g, '/')));
        }
        
        const start = dates.reduce((a, b) => a < b ? a : b);
        const end = dates.reduce((a, b) => a > b ? a : b, new Date(0));
        
        return { start, end: isSameDay(end, new Date(0)) ? start : end };
    }, [attendance, trackingStartDate]);

    const monthsInView = useMemo(() => {
        const months = new Map<string, Date[]>();
        if (!dateRange.start) return months;

        const interval = eachDayOfInterval({
            start: startOfMonth(dateRange.start),
            end: endOfMonth(dateRange.end)
        });

        interval.forEach(day => {
            const monthKey = format(day, 'yyyy-MM');
            if (!months.has(monthKey)) {
                months.set(monthKey, []);
            }
            months.get(monthKey)!.push(day);
        });

        return months;
    }, [dateRange]);

    const attendanceStatusByDate = useMemo(() => {
        const statusMap = new Map<string, { status: string, details: string }>();
        
        const allDates = Array.from(monthsInView.values()).flat();

        for (const date of allDates) {
            const dateString = format(date, 'yyyy-MM-dd');

            if (holidays.includes(dateString)) {
                statusMap.set(dateString, { status: 'holiday', details: 'Holiday' });
                continue;
            }
            if (checkIsSunday(dateString)) {
                 statusMap.set(dateString, { status: 'weekend', details: 'Sunday' });
                 continue;
            }

            const scheduleForDay = getScheduleForDate(dateString);
            const attendanceRecords = attendance.filter(a => a.date === dateString);
            
            if (scheduleForDay.length === 0) {
                 statusMap.set(dateString, { status: 'no-class', details: 'No classes scheduled' });
                 continue;
            }
            
            if (attendanceRecords.length === 0) {
                 statusMap.set(dateString, { status: 'no-data', details: 'No attendance logged' });
                 continue;
            }
            
            const attended = attendanceRecords.filter(r => r.status === 'Attended').length;
            const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
            const cancelled = attendanceRecords.filter(r => r.status === 'Cancelled').length;
            
            let details = attendanceRecords.map(r => {
                const slotId = r.slotId;
                const slot = scheduleForDay.find(s => s.id === slotId);
                const subject = subjectMap.get(slot?.subjectId || '');
                return `${subject?.name || 'Unknown'}: ${r.status}`;
            }).join('\n');

            if (absent > 0 && attended > 0) {
                statusMap.set(dateString, { status: 'mixed', details });
            } else if (absent > 0) {
                statusMap.set(dateString, { status: 'absent', details });
            } else if (attended > 0) {
                statusMap.set(dateString, { status: 'attended', details });
            } else if (cancelled > 0) {
                 statusMap.set(dateString, { status: 'cancelled', details });
            } else {
                 statusMap.set(dateString, { status: 'no-data', details: 'Status pending' });
            }
        }
        return statusMap;
    }, [monthsInView, attendance, holidays, subjectMap, getScheduleForDate]);
    
    if (monthsInView.size === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>Semester View</CardTitle></CardHeader>
                <CardContent className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No attendance data to display yet.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
             <CardHeader>
                <CardTitle>Semester Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(monthsInView.keys()).sort().map(monthKey => {
                    const monthDays = monthsInView.get(monthKey)!;
                    const firstDayOfMonth = monthDays[0];
                    const startingDayOfWeek = getDay(firstDayOfMonth); // 0 for Sunday
                    
                    return (
                        <div key={monthKey} className="p-3 border rounded-lg">
                            <h3 className="text-lg font-semibold text-center mb-2">{format(firstDayOfMonth, 'MMMM yyyy')}</h3>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                                {weekDays.map(day => <div key={day}>{day}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1 mt-1">
                                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {monthDays.map(day => {
                                    const dateString = format(day, 'yyyy-MM-dd');
                                    const dayStatus = attendanceStatusByDate.get(dateString);
                                    
                                    const statusClass = {
                                        attended: 'bg-green-500/80',
                                        absent: 'bg-red-500/80',
                                        mixed: 'bg-gradient-to-br from-green-500/80 to-red-500/80',
                                        holiday: 'bg-blue-500/80',
                                        cancelled: 'bg-gray-400/80',
                                        weekend: 'bg-muted/50',
                                        'no-class': 'bg-muted/50',
                                        'no-data': 'bg-muted border border-dashed'
                                    }[dayStatus?.status || 'no-data'];

                                    return (
                                        <TooltipProvider key={dateString} delayDuration={100}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={cn("h-8 w-8 rounded flex items-center justify-center text-xs text-white", statusClass)}>
                                                        {format(day, 'd')}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs whitespace-pre-wrap text-center">
                                                    <p className="font-bold">{format(day, 'PPP')}</p>
                                                    <p>{dayStatus?.details || 'No data'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

