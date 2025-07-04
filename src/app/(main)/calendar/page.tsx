
"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, getDay } from 'date-fns';
import type { DayOfWeek, AttendanceStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Book, FlaskConical } from 'lucide-react';

const dayMap: { [key: number]: DayOfWeek | undefined } = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat'
};

const AttendanceBadge = ({ status }: { status: AttendanceStatus }) => {
    const statusColors: Record<AttendanceStatus, React.CSSProperties> = {
        Attended: {
            backgroundColor: 'hsla(var(--chart-2), 0.2)',
            color: 'hsl(var(--chart-2))',
        },
        Absent: {
            backgroundColor: 'hsla(var(--destructive), 0.2)',
            color: 'hsl(var(--destructive))',
        },
        Cancelled: {
            backgroundColor: 'hsl(var(--muted))',
            color: 'hsl(var(--muted-foreground))',
        },
    };
    return (
        <span 
            style={statusColors[status]} 
            className="px-2 py-0.5 text-xs font-medium rounded-full"
        >
            {status}
        </span>
    );
};


export default function CalendarPage() {
    const { timetable, subjects, attendance, isLoaded } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const dailyAttendanceStatus = useMemo(() => {
        if (!isLoaded) return {};
        const statusByDate: { [key: string]: 'attended' | 'absent' | 'cancelled' } = {};

        const attendanceByDate = attendance.reduce((acc, record) => {
            (acc[record.date] = acc[record.date] || []).push(record.status);
            return acc;
        }, {} as Record<string, AttendanceStatus[]>);

        for (const date in attendanceByDate) {
            const statuses = new Set(attendanceByDate[date]);
            if (statuses.has('Absent')) {
                statusByDate[date] = 'absent';
            } else if (statuses.has('Attended')) {
                statusByDate[date] = 'attended';
            } else if (statuses.has('Cancelled')) {
                statusByDate[date] = 'cancelled';
            }
        }
        return statusByDate;
    }, [attendance, isLoaded]);

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

    const selectedDayOfWeek = selectedDate ? dayMap[getDay(selectedDate)] : undefined;
    const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;

    const scheduleForSelectedDate = timetable
        .filter(slot => slot.day === selectedDayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (!isLoaded) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
                <Skeleton className="h-[365px] w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
            <Card>
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    modifiers={modifiers}
                    modifiersStyles={modifierStyles}
                    className="w-full"
                />
            </Card>

            {selectedDate && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Schedule for {format(selectedDate, 'PPP')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {scheduleForSelectedDate.length > 0 ? (
                             scheduleForSelectedDate.map(slot => {
                                const subject = subjects.find(s => s.id === slot.subjectId);
                                if (!subject) return null;
                                const SubjectIcon = subject.type === 'Lab' ? FlaskConical : Book;
                                const record = attendance.find(r => r.id === `${selectedDateString}-${slot.id}`);

                                return (
                                    <div key={slot.id} className="w-full bg-card-foreground/5 rounded-lg p-3 flex items-center gap-4 justify-between">
                                        <div className="flex items-center gap-4">
                                            <SubjectIcon className="w-6 h-6 text-primary flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold">{subject.name}</p>
                                                <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {record ? <AttendanceBadge status={record.status} /> : <span className="text-xs text-muted-foreground italic">Not Logged</span>}
                                        </div>
                                    </div>
                                );
                             })
                        ) : (
                             <div className="text-center p-4 rounded-lg bg-muted/20 h-24 flex items-center justify-center flex-col">
                                 <Info className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No classes scheduled for this day.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
