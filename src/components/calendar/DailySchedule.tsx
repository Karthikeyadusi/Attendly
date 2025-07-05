
"use client";

import React, { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { AttendanceStatus, AttendanceRecord, TimeSlot, OneOffSlot } from '@/types';
import { Info, Book, FlaskConical, CheckCircle2, XCircle, Ban, CalendarClock, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import RescheduleDialog from './RescheduleDialog';

const statusOptions = [
  { value: 'Attended', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'Absent', icon: XCircle, color: 'text-red-500' },
  { value: 'Cancelled', icon: Ban, color: 'text-gray-500' },
] as const;

const AttendanceBadge = ({ status }: { status: AttendanceStatus }) => {
    const statusConfig = {
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
        Postponed: {
            backgroundColor: 'hsla(var(--chart-4), 0.2)',
            color: 'hsl(var(--chart-4))',
        },
    };
    return (
        <span 
            style={statusConfig[status]} 
            className="px-2 py-0.5 text-xs font-medium rounded-full"
        >
            {status}
        </span>
    );
};

interface DailyScheduleProps {
  selectedDate: Date | undefined;
}

function DailySchedule({ selectedDate }: DailyScheduleProps) {
  const { subjectMap, attendanceByDate, logAttendance, getScheduleForDate, isLoaded, holidays, toggleHoliday } = useApp();
  const [openPopoverId, setOpenPopoverId] = React.useState<string | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | OneOffSlot | null>(null);

  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const isHoliday = !!selectedDateString && holidays.includes(selectedDateString);

  const attendanceForSelectedDateMap = useMemo(() => {
    if (!selectedDateString || !isLoaded) return new Map<string, AttendanceRecord>();
    const recordsForDate = attendanceByDate.get(selectedDateString) || [];
    return new Map(recordsForDate.map(record => [record.slotId, record]));
  }, [selectedDateString, attendanceByDate, isLoaded]);

  const scheduleForSelectedDate = useMemo(() => {
    if (!selectedDateString) return [];
    return getScheduleForDate(selectedDateString);
  }, [selectedDateString, getScheduleForDate]);


  if (!selectedDate || !selectedDateString) {
    return null;
  }

  const handlePostponeClick = (slot: TimeSlot | OneOffSlot) => {
    setOpenPopoverId(null);
    setRescheduleSlot(slot);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-2">
            <CardTitle>Schedule for {format(selectedDate, 'PPP')}</CardTitle>
            <Button onClick={() => toggleHoliday(selectedDateString)} variant="outline" size="sm" disabled={!selectedDateString}>
                <Gift className="mr-2 h-4 w-4" />
                {isHoliday ? 'Unmark Holiday' : 'Mark as Holiday'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isHoliday ? (
             <div className="text-center p-4 rounded-lg bg-muted/20 h-24 flex items-center justify-center flex-col">
                <Gift className="w-8 h-8 text-primary mb-2" />
                <p className="font-semibold">This day is a holiday.</p>
                <p className="text-sm text-muted-foreground">No classes will be counted.</p>
            </div>
          ) : scheduleForSelectedDate.length > 0 ? (
            scheduleForSelectedDate.map(slot => {
              const subject = subjectMap.get(slot.subjectId);
              if (!subject) return null;

              const isOneOff = 'date' in slot;
              const SubjectIcon = isOneOff ? CalendarClock : (subject.type === 'Lab' ? FlaskConical : Book);
              const record = attendanceForSelectedDateMap.get(slot.id);

              const handleLogAndClose = (status: AttendanceStatus) => {
                if (selectedDateString) {
                  logAttendance(slot, selectedDateString, status);
                }
                setOpenPopoverId(null);
              };

              return (
                <div key={slot.id} className="w-full bg-card-foreground/5 rounded-lg p-3 flex items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <SubjectIcon className={cn("w-6 h-6 flex-shrink-0", isOneOff ? 'text-amber-500' : 'text-primary')} />
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
                           <Button
                              variant="ghost"
                              onClick={() => handlePostponeClick(slot)}
                              className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-md transition-colors text-amber-500"
                            >
                              <CalendarClock className="h-5 w-5" />
                              <span className="text-xs font-medium">Postpone</span>
                            </Button>
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
      {rescheduleSlot && selectedDateString && (
        <RescheduleDialog
          open={!!rescheduleSlot}
          onOpenChange={(open) => !open && setRescheduleSlot(null)}
          slot={rescheduleSlot}
          date={selectedDateString}
        />
      )}
    </>
  );
}

export default React.memo(DailySchedule);
