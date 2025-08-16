
"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, isSunday as checkIsSunday } from "@/lib/utils";
import type { AttendanceStatus, TimeSlot, OneOffSlot } from "@/types";
import { CheckCircle2, XCircle, Ban, Info, CalendarClock, Book, FlaskConical, Gift, Undo2, Trash2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { useState } from "react";
import RescheduleDialog from "../calendar/RescheduleDialog";
import { format } from "date-fns";
import WeeklyDebrief from "./WeeklyDebrief";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const statusOptions = [
  { value: 'Attended', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'Absent', icon: XCircle, color: 'text-red-500' },
  { value: 'Cancelled', icon: Ban, color: 'text-gray-500' },
] as const;

export default function TodaysClasses() {
  const { subjects, attendance, logAttendance, clearAttendanceRecord, isLoaded, getScheduleForDate, holidays, toggleHoliday, oneOffSlots, undoPostpone, deleteOneOffSlot } = useApp();
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | OneOffSlot | null>(null);

  const today = new Date();
  const todayDateString = format(today, 'yyyy-MM-dd');
  const isSunday = checkIsSunday(todayDateString);

  const isHoliday = holidays.includes(todayDateString);
  const todaysSchedule = getScheduleForDate(todayDateString);

  if (!isLoaded) return <Skeleton className="h-48" />;

  const renderContent = () => {
    if (isSunday && todaysSchedule.length === 0) {
      return <WeeklyDebrief />;
    }

    if (isHoliday) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-32">
          <Gift className="w-8 h-8 text-primary mb-2" />
          <p className="font-semibold">Today is a holiday.</p>
          <p className="text-muted-foreground">No classes will be counted.</p>
        </div>
      );
    }
    if (todaysSchedule.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-32">
          <Info className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No classes scheduled for today.</p>
          <p className="text-xs text-muted-foreground">{isSunday ? "Enjoy your Sunday!" : "Enjoy your day off!"}</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {todaysSchedule.map(slot => {
          const subject = subjects.find(s => s.id === slot.subjectId);
          if (!subject) return null;

          const record = attendance.find(r => r.id === `${todayDateString}-${slot.id}`);
          const isOneOff = 'date' in slot;
          
          const originalRecordForPostponeCheck = 'originalSlotId' in slot 
            ? attendance.find(r => r.date === slot.originalDate && r.slotId === slot.originalSlotId)
            : record;

          const isVisuallyPostponed = originalRecordForPostponeCheck?.status === 'Postponed';

          if (isVisuallyPostponed && !isOneOff) {
            const rescheduledTo = oneOffSlots.find(s => s.originalSlotId === slot.id);
            return (
              <div key={slot.id} className="p-3 rounded-lg border bg-muted text-muted-foreground">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {subject.type === 'Lab' ? <FlaskConical className="w-5 h-5" /> : <Book className="w-5 h-5" />}
                    <div>
                      <p className="font-semibold text-base sm:text-lg line-through">{subject.name}</p>
                      <p className="text-sm">{slot.startTime} - {slot.endTime}</p>
                    </div>
                  </div>
                  {rescheduledTo ? (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-500">Postponed</p>
                      <p className="text-xs">
                        to {format(new Date(rescheduledTo.date.replace(/-/g, '/')), 'MMM d')} at {rescheduledTo.startTime}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold bg-amber-500/20 text-amber-500 px-2 py-1 rounded-full">Postponed</span>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={slot.id} className={cn("p-3 rounded-lg border", isOneOff ? "border-amber-500/50 bg-amber-500/10" : "bg-card-foreground/5")}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  { isOneOff ? <CalendarClock className="w-5 h-5 text-amber-500" /> : subject.type === 'Lab' ? <FlaskConical className="w-5 h-5 text-primary" /> : <Book className="w-5 h-5 text-primary" /> }
                  <div>
                    <p className="font-semibold text-base sm:text-lg">{subject.name}</p>
                    <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full">{subject.type}</span>
              </div>
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {statusOptions.map(opt => (
                  <Button
                    key={opt.value}
                    variant="ghost"
                    onClick={() => logAttendance(slot, todayDateString, opt.value as AttendanceStatus)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 cursor-pointer p-2 rounded-md transition-colors h-16",
                      record?.status === opt.value
                        ? `bg-primary/20 ${opt.color} hover:bg-primary/20`
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <opt.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs font-medium">{opt.value}</span>
                  </Button>
                ))}
                <Button
                    variant="ghost"
                    onClick={() => setRescheduleSlot(slot)}
                     className={cn(
                      "flex flex-col items-center justify-center gap-1 cursor-pointer p-2 rounded-md transition-colors h-16",
                      record?.status === "Postponed"
                        ? `bg-primary/20 text-amber-500 hover:bg-primary/20`
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-xs font-medium">Postpone</span>
                  </Button>
              </div>
              {record && record.status !== 'Postponed' && (
                <div className="mt-2 pt-2 border-t flex justify-center">
                  <Button variant="link" size="sm" onClick={() => clearAttendanceRecord(slot.id, todayDateString)}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Undo Log
                  </Button>
                </div>
              )}
              {isOneOff && 'originalDate' in slot && (
                <div className="mt-2 pt-2 border-t border-amber-500/20 flex justify-center items-center gap-2">
                  <Button variant="link" size="sm" className="text-amber-600 dark:text-amber-500" onClick={() => undoPostpone(slot.id)}>
                    <Undo2 className="mr-2 h-4 w-4" />
                    Undo
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="link" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Delete Rescheduled Class?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This will permanently delete this one-off class and restore the original class on {format(new Date(slot.originalDate.replace(/-/g, '/')), 'PPP')}. This action cannot be undone.
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
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>{format(today, 'EEEE, MMMM d, yyyy')}</CardDescription>
            </div>
            <Button onClick={() => toggleHoliday(todayDateString)} variant="outline" size="sm" className="flex-shrink-0" disabled={isSunday}>
              <Gift className="mr-2 h-4 w-4" />
              {isHoliday ? 'Unmark Holiday' : 'Mark as Holiday'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      {rescheduleSlot && (
        <RescheduleDialog
          open={!!rescheduleSlot}
          onOpenChange={(open) => !open && setRescheduleSlot(null)}
          slot={rescheduleSlot}
          date={todayDateString}
        />
      )}
    </>
  );
}
