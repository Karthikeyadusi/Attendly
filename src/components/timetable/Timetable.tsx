"use client";

import { useApp } from "@/components/AppProvider";
import type { DayOfWeek } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Timetable() {
  const { timetable, subjects, deleteTimetableSlot } = useApp();
  
  const sortedTimetable = [...timetable].sort((a,b) => a.startTime.localeCompare(b.startTime));

  if (timetable.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center h-48">
          <Info className="w-8 h-8 text-muted-foreground mb-2" />
          <h3 className="text-lg font-semibold">Empty Timetable</h3>
          <p className="text-sm text-muted-foreground">
              Click "Add Class" to build your schedule.
          </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {days.map(day => {
        const daySlots = sortedTimetable.filter(slot => slot.day === day);
        return (
          <Card key={day} className="flex flex-col">
            <CardHeader className="text-center pb-2">
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 flex-1 p-4 pt-0">
              {daySlots.length > 0 ? (
                <div className="space-y-2">
                {daySlots.map(slot => {
                  const subject = subjects.find(s => s.id === slot.subjectId);
                  return (
                    <Card key={slot.id} className="w-full bg-card-foreground/5">
                      <CardHeader className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{subject?.name || "Unknown Subject"}</CardTitle>
                            <CardDescription>{slot.startTime} - {slot.endTime}</CardDescription>
                          </div>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this class slot?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Are you sure you want to remove the {subject?.name} class on {day} at {slot.startTime}?
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
                      </CardHeader>
                    </Card>
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
        );
      })}
    </div>
  );
}
