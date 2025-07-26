
"use client";

import React, { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay } from 'date-fns';
import { cn, isSunday as checkIsSunday } from '@/lib/utils';
import { Book, FlaskConical } from 'lucide-react';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LegendItem = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
        <div className={cn("h-4 w-4 rounded", color)} />
        <span className="text-sm text-muted-foreground">{label}</span>
    </div>
);

const AttendanceBadge = ({ status }: { status: string }) => {
    const statusConfig: { [key: string]: string } = {
        Attended: 'bg-green-500/20 text-green-700 dark:text-green-400',
        Absent: 'bg-red-500/20 text-red-700 dark:text-red-400',
        Cancelled: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
        Postponed: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
    };
    return (
        <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", statusConfig[status] || 'bg-muted')}>
            {status}
        </span>
    );
};

export default function SemesterView() {
    const { attendance, holidays, trackingStartDate, subjectMap, getScheduleForDate } = useApp();
    const [selectedDay, setSelectedDay] = useState<{ date: Date, details: any[] } | null>(null);

    const dateRange = useMemo(() => {
        const today = new Date();
        if (!attendance.length && !trackingStartDate) {
            return { start: startOfMonth(today), end: endOfMonth(today) };
        }
        
        const dates = attendance.map(a => new Date(a.date.replace(/-/g, '/')));
        if (trackingStartDate) {
            dates.push(new Date(trackingStartDate.replace(/-/g, '/')));
        }
        if (dates.length === 0) {
             return { start: startOfMonth(today), end: endOfMonth(today) };
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
        const statusMap = new Map<string, { status: string, schedule: any[] }>();
        
        const allDates = Array.from(monthsInView.values()).flat();

        for (const date of allDates) {
            const dateString = format(date, 'yyyy-MM-dd');

            if (holidays.includes(dateString)) {
                statusMap.set(dateString, { status: 'holiday', schedule: [] });
                continue;
            }
            if (checkIsSunday(dateString)) {
                 statusMap.set(dateString, { status: 'weekend', schedule: [] });
                 continue;
            }

            const scheduleForDay = getScheduleForDate(dateString);
            const attendanceRecords = attendance.filter(a => a.date === dateString);
            
            const scheduleWithStatus = scheduleForDay.map(slot => {
                const record = attendanceRecords.find(r => r.slotId === slot.id);
                const subject = subjectMap.get(slot.subjectId);
                return {
                    ...slot,
                    subjectName: subject?.name || "Unknown",
                    subjectType: subject?.type,
                    status: record?.status || "Not Logged"
                };
            });
            
            if (scheduleForDay.length === 0) {
                 statusMap.set(dateString, { status: 'no-class', schedule: [] });
                 continue;
            }
            
            if (attendanceRecords.length === 0) {
                 statusMap.set(dateString, { status: 'no-data', schedule: scheduleWithStatus });
                 continue;
            }
            
            const attended = attendanceRecords.filter(r => r.status === 'Attended').length;
            const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
            const allCancelled = attendanceRecords.length > 0 && attendanceRecords.every(r => r.status === 'Cancelled');

            if (absent > 0 && attended > 0) {
                statusMap.set(dateString, { status: 'mixed', schedule: scheduleWithStatus });
            } else if (absent > 0) {
                statusMap.set(dateString, { status: 'absent', schedule: scheduleWithStatus });
            } else if (attended > 0) {
                statusMap.set(dateString, { status: 'attended', schedule: scheduleWithStatus });
            } else if (allCancelled) {
                 statusMap.set(dateString, { status: 'cancelled', schedule: scheduleWithStatus });
            } else {
                 statusMap.set(dateString, { status: 'no-data', schedule: scheduleWithStatus });
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
        <>
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
                                        attended: 'bg-green-500/80 hover:ring-2 hover:ring-green-400',
                                        absent: 'bg-red-500/80 hover:ring-2 hover:ring-red-400',
                                        mixed: 'bg-gradient-to-br from-green-500/80 to-red-500/80 hover:ring-2 hover:ring-yellow-400',
                                        holiday: 'bg-blue-500/80',
                                        cancelled: 'bg-gray-400/80 hover:ring-2 hover:ring-gray-300',
                                        weekend: 'bg-muted/50',
                                        'no-class': 'bg-muted/50',
                                        'no-data': 'bg-muted border border-dashed hover:ring-2 hover:ring-primary'
                                    }[dayStatus?.status || 'no-data'];

                                    const isClickable = dayStatus && dayStatus.status !== 'holiday' && dayStatus.status !== 'weekend' && dayStatus.status !== 'no-class';

                                    return (
                                        <div 
                                            key={dateString} 
                                            className={cn(
                                                "h-8 w-8 rounded flex items-center justify-center text-xs", 
                                                statusClass,
                                                isClickable ? "cursor-pointer text-white" : "text-muted-foreground"
                                            )}
                                            onClick={() => isClickable && setSelectedDay({ date: day, details: dayStatus.schedule })}
                                        >
                                            {format(day, 'd')}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-x-4 gap-y-2 pt-4 border-t">
                <LegendItem color="bg-green-500/80" label="Full Day" />
                <LegendItem color="bg-red-500/80" label="All Absent" />
                <LegendItem color="bg-gradient-to-br from-green-500/80 to-red-500/80" label="Mixed" />
                <LegendItem color="bg-blue-500/80" label="Holiday" />
                <LegendItem color="bg-gray-400/80" label="All Cancelled" />
                <LegendItem color="bg-muted border border-dashed" label="Not Logged" />
            </CardFooter>
        </Card>
        
        {selectedDay && (
             <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule for {format(selectedDay.date, 'PPP')}</DialogTitle>
                        <DialogDescription>
                            Here's the breakdown of your classes for this day.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {selectedDay.details.length > 0 ? selectedDay.details.map(item => (
                             <div key={item.id} className="w-full bg-card-foreground/5 rounded-lg p-3 flex items-center gap-4 justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        {item.subjectType === 'Lab' ? <FlaskConical className="w-6 h-6 text-primary" /> : <Book className="w-6 h-6 text-primary" />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold">{item.subjectName}</p>
                                        <p className="text-sm text-muted-foreground">{item.startTime} - {item.endTime}</p>
                                    </div>
                                </div>
                                <AttendanceBadge status={item.status} />
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-center py-8">No scheduled classes for this day.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        )}
        </>
    );
}
