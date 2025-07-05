
"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceStatus, DayOfWeek } from "@/types";
import { CheckCircle2, XCircle, Ban, Info, CalendarClock } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";

const statusOptions = [
  { value: 'Attended', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'Absent', icon: XCircle, color: 'text-red-500' },
  { value: 'Cancelled', icon: Ban, color: 'text-gray-500' },
  { value: 'Postponed', icon: CalendarClock, color: 'text-amber-500' },
] as const;

export default function TodaysClasses() {
  const { timetable, subjects, attendance, logAttendance, isLoaded } = useApp();

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'short' }) as DayOfWeek;
  const todayDateString = today.toISOString().split('T')[0];

  const todaysSchedule = timetable
    .filter(slot => slot.day === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (!isLoaded) return <Skeleton className="h-48" />;

  if (todaysSchedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center h-32">
            <Info className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No classes scheduled for today.</p>
            <p className="text-xs text-muted-foreground">Enjoy your day off!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Schedule</CardTitle>
        <CardDescription>{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {todaysSchedule.map(slot => {
          const subject = subjects.find(s => s.id === slot.subjectId);
          if (!subject) return null;

          const record = attendance.find(r => r.id === `${todayDateString}-${slot.id}`);

          return (
            <div key={slot.id} className="p-3 rounded-lg border bg-card-foreground/5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold text-base sm:text-lg">{subject.name}</p>
                  <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                </div>
                <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full">{subject.type}</span>
              </div>
              <div
                className="grid grid-cols-4 gap-2"
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
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
