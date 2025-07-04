"use client";

import { useApp } from "@/components/AppProvider";
import type { DayOfWeek, TimeSlot } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Timetable() {
  const { timetable, subjects, deleteTimetableSlot } = useApp();
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const defaultTab = days.includes(today as DayOfWeek) ? today : 'Mon';

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
    <Tabs defaultValue={defaultTab}>
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
        {days.map(day => (
          <TabsTrigger key={day} value={day}>{day}</TabsTrigger>
        ))}
      </TabsList>
      {days.map(day => {
        const daySlots = sortedTimetable.filter(slot => slot.day === day);
        return (
          <TabsContent key={day} value={day}>
            {daySlots.length > 0 ? (
              <div className="space-y-2">
                {daySlots.map(slot => {
                  const subject = subjects.find(s => s.id === slot.subjectId);
                  return (
                    <Card key={slot.id} className="w-full">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{subject?.name || "Unknown Subject"}</CardTitle>
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
                <div className="text-center p-8 rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">No classes scheduled for {day}.</p>
                </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
