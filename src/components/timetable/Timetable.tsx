
"use client";

import { useApp } from "@/components/AppProvider";
import type { DayOfWeek, TimeSlot } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Trash2, Book, FlaskConical, CalendarX, Pencil } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNames: { [key in DayOfWeek]: string } = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

export default function Timetable({ onEdit }: { onEdit: (slot: TimeSlot) => void }) {
  const { timetable, subjects, deleteTimetableSlot } = useApp();
  const [api, setApi] = useState<CarouselApi>()
  const [todayIndex, setTodayIndex] = useState(-1);

  useEffect(() => {
    // Sunday - 0, Monday - 1, etc.
    const today = new Date().getDay();
    // Map to our days array which is Mon-Sat (0-5)
    const dayMap = [-1, 0, 1, 2, 3, 4, 5];
    setTodayIndex(dayMap[today]);
  }, []);

  useEffect(() => {
    if (!api) return;
    
    // On load, scroll to today's card if it's a weekday, otherwise default to Monday
    const initialIndex = todayIndex !== -1 ? todayIndex : 0;
    api.scrollTo(initialIndex, true);

  }, [api, todayIndex]);
  
  const sortedTimetable = [...timetable].sort((a,b) => a.startTime.localeCompare(b.startTime));

  if (timetable.length === 0) {
    return (
      <Card className="h-64">
          <CardHeader className="flex flex-col items-center justify-center text-center h-full">
              <CalendarX className="w-12 h-12 text-primary mb-4" />
              <CardTitle className="text-xl">Your Timetable is Empty</CardTitle>
              <CardDescription>
                  Add your first class to build your schedule.
              </CardDescription>
          </CardHeader>
      </Card>
    );
  }

  return (
    <Carousel setApi={setApi} opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-4">
            {days.map((day, index) => {
                const daySlots = sortedTimetable.filter(slot => slot.day === day);
                const isToday = index === todayIndex;

                return (
                    <CarouselItem key={day} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <Card className={cn("flex flex-col h-full min-h-[350px]", isToday && "ring-2 ring-primary shadow-lg shadow-primary/20")}>
                            <CardHeader className="text-center pb-2">
                              <CardTitle>{dayNames[day]}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 flex-1 p-4 pt-0 overflow-y-auto">
                            {daySlots.length > 0 ? (
                                <div className="space-y-3">
                                {daySlots.map(slot => {
                                  const subject = subjects.find(s => s.id === slot.subjectId);
                                  const SubjectIcon = subject?.type === 'Lab' ? FlaskConical : Book;
                                  return (
                                    <div key={slot.id} className="w-full bg-card-foreground/5 rounded-lg p-3 flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            <SubjectIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-semibold">{subject?.name || "Unknown Subject"}</p>
                                            <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 flex-shrink-0" onClick={() => onEdit(slot)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8 flex-shrink-0">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this class slot?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove the {subject?.name} class on {dayNames[day]} at {slot.startTime}?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteTimetableSlot(slot.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                  );
                                })}
                                </div>
                            ) : (
                                <div className="text-center p-4 rounded-lg bg-muted/20 h-full flex items-center justify-center">
                                    <p className="text-sm text-muted-foreground">No classes scheduled.</p>
                                </div>
                            )}
                            </CardContent>
                        </Card>
                    </CarouselItem>
                );
            })}
        </CarouselContent>
        <CarouselPrevious className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
        <CarouselNext className="absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
    </Carousel>
  );
}
