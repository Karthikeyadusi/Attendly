"use client";

import { useState, useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, getDay } from 'date-fns';
import type { DayOfWeek, AttendanceStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Book, FlaskConical, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const dayMap: { [key: number]: DayOfWeek | undefined } = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat'
};

const statusOptions = [
  { value: 'Attended', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'Absent', icon: XCircle, color: 'text-red-500' },
  { value: 'Cancelled', icon: Ban, color: 'text-gray-500' },
] as const;

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
    const { timetable, subjects, attendance, logAttendance, isLoaded } = useApp();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

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
        cancelled: (date: Date) => dailyAttendanceStatus[format(date, 'yyyy-M-dd')] === 'cancelled',
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

            {selectedDate && selectedDateString && (
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

                                const handleLogAndClose = (status: AttendanceStatus) => {
                                    if(selectedDateString) {
                                        logAttendance(slot, selectedDateString, status);
                                    }
                                    setOpenPopoverId(null);
                                };

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
                                            <Popover open={openPopoverId === slot.id} onOpenChange={(open) => setOpenPopoverId(open ? slot.id : null)}>
                                                <PopoverTrigger asChild>
                                                    {record ? (
                                                        <Button variant="ghost" className="h-auto p-0 rounded-full">
                                                            <AttendanceBadge status={record.status} />
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm">Log Now</Button>
                                                    )}
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <div className="flex gap-1 p-1">
                                                        {statusOptions.map(opt => (
                                                            <Button
                                                                key={opt.value}
                                                                variant="ghost"
                                                                onClick={() => handleLogAndClose(opt.value as AttendanceStatus)}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-md transition-colors",
                                                                    opt.color
                                                                )}
                                                            >
                                                                <opt.icon className="h-5 w-5" />
                                                                <span className="text-xs font-medium">{opt.value}</span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
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
