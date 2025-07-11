
"use client";

import React, { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { AttendanceStatus, AttendanceRecord, TimeSlot, OneOffSlot } from '@/types';
import { Info, Book, FlaskConical, CheckCircle2, XCircle, Ban, CalendarClock, Gift, Undo2, Trash2 } from 'lucide-react';
import { cn, isSunday as checkIsSunday } from '@/lib/utils';
import RescheduleDialog from './RescheduleDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const { subjectMap, attendanceByDate, logAttendance, clearAttendanceRecord, getScheduleForDate, isLoaded, holidays, toggleHoliday, oneOffSlots, undoPostpone, deleteOneOffSlot } = useApp();
  const [openPopoverId, setOpenPopoverId] = React.useState<string | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | OneOffSlot | null>(null);

  const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
  const isHoliday = !!selectedDateString && holidays.includes(selectedDateString);
  const isSunday = !!selectedDateString && checkIsSunday(selectedDateString);

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
            <Button onClick={() => toggleHoliday(selectedDateString)} variant="outline" size="sm" disabled={!selectedDateString || isSunday}>
                <Gift className="mr-2 h-4 w-4" />
                {isHoliday ? 'Unmark Holiday' : 'Mark as Holiday'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isHoliday || isSunday ? (
             <div className="text-center p-4 rounded-lg bg-muted/20 h-24 flex items-center justify-center flex-col">
                <Gift className="w-8 h-8 text-primary mb-2" />
                <p className="font-semibold">{isSunday ? "It's Sunday!" : "This day is a holiday."}</p>
                <p className="text-sm text-muted-foreground">No classes will be counted.</p>
            </div>
          ) : scheduleForSelectedDate.length > 0 ? (
            scheduleForSelectedDate.map(slot => {
              const subject = subjectMap.get(slot.subjectId);
              if (!subject) return null;

              const isOneOff = 'date' in slot;
              const record = attendanceForSelectedDateMap.get(slot.id);
              
              if (record?.status === 'Postponed') {
                const rescheduledTo = oneOffSlots.find(s => s.originalSlotId === slot.id);
                return (
                  <div key={slot.id} className="w-full bg-muted rounded-lg p-3 flex items-center gap-4 justify-between text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <Book className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="font-semibold line-through">{subject.name}</p>
                        <p className="text-sm">{slot.startTime} - {slot.endTime}</p>
                      </div>
                    </div>
                     {rescheduledTo ? (
                        <div className="text-right">
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-500">Postponed</p>
                          <p className="text-xs">to {format(new Date(rescheduledTo.date + 'T00:00:00'), 'MMM d')}</p>
                        </div>
                      ) : (
                        <AttendanceBadge status="Postponed" />
                      )}
                  </div>
                );
              }
              
              const SubjectIcon = isOneOff ? CalendarClock : (subject.type === 'Lab' ? FlaskConical : Book);

              const handleLogAndClose = (status: AttendanceStatus) => {
                if (selectedDateString) {
                  logAttendance(slot, selectedDateString, status);
                }
                setOpenPopoverId(null);
              };

              const handleClearAndClose = () => {
                if (selectedDateString) {
                  clearAttendanceRecord(slot.id, selectedDateString);
                }
                setOpenPopoverId(null);
              };

              return (
                <div key={slot.id} className={cn("w-full rounded-lg p-3 flex items-center gap-4 justify-between", isOneOff ? "border border-amber-500/50 bg-amber-500/10" : "bg-card-foreground/5")}>
                  <div className="flex items-center gap-4">
                    <SubjectIcon className={cn("w-6 h-6 flex-shrink-0", isOneOff ? 'text-amber-500' : 'text-primary')} />
                    <div>
                      <p className="font-semibold">{subject.name}</p>
                      <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOneOff && 'originalDate' in slot && (
                      <div className="flex items-center gap-1">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 dark:text-amber-500" onClick={() => undoPostpone(slot.id)}>
                                  <Undo2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Undo Postponement</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Rescheduled Class?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this one-off class and restore the original class on {format(new Date(slot.originalDate + 'T00:00:00'), 'PPP')}. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteOneOffSlot(slot.id)} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
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
                        <div className="grid grid-cols-3 gap-1 p-1">
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
                            <Button
                              variant="ghost"
                              onClick={handleClearAndClose}
                              disabled={!record}
                              className="flex flex-col items-center justify-center gap-1 h-14 w-14 rounded-md transition-colors text-muted-foreground"
                            >
                              <Undo2 className="h-5 w-5" />
                              <span className="text-xs font-medium">Clear</span>
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

    