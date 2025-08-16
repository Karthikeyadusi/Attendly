
"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useApp } from "@/components/AppProvider";
import type { DayOfWeek, TimeSlot } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Trash2, Book, FlaskConical, CalendarX, Pencil, GripVertical } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, type DragStartEvent, type DragEndEvent, type DragOverEvent, type DragMoveEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNames: { [key in DayOfWeek]: string } = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

// Draggable Slot Component
const DraggableTimeSlot = ({ slot, onEdit }: { slot: TimeSlot; onEdit: (slot: TimeSlot) => void }) => {
    const { subjects, deleteTimetableSlot } = useApp();
    const isMobile = useIsMobile();
    const subject = subjects.find(s => s.id === slot.subjectId);
    const SubjectIcon = subject?.type === 'Lab' ? FlaskConical : Book;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id, data: { day: slot.day } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
    };

    if (!subject) return null;

    return (
        <div ref={setNodeRef} style={style} className="w-full touch-none">
            <div className="w-full bg-card-foreground/5 rounded-lg p-3 flex items-center gap-2">
                <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-1">
                    <GripVertical className="w-5 h-5" />
                </button>
                <div className="flex-shrink-0">
                    <SubjectIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-grow">
                    <p className="font-semibold">{subject.name || "Unknown Subject"}</p>
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
                                Are you sure you want to remove the {subject.name} class on {dayNames[slot.day]} at {slot.startTime}?
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
        </div>
    );
};

// Day Column Component
const DayColumn = ({ day, slots, onEdit }: { day: DayOfWeek; slots: TimeSlot[]; onEdit: (slot: TimeSlot) => void }) => {
    const { setNodeRef } = useSortable({ id: day, disabled: true });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[280px] h-full">
            <Card className="flex flex-col h-full">
                <CardHeader className="text-center pb-2">
                    <CardTitle>{dayNames[day]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 p-2 overflow-y-auto">
                    <SortableContext items={slots.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {slots.length > 0 ? (
                            slots.map(slot => (
                                <DraggableTimeSlot key={slot.id} slot={slot} onEdit={onEdit} />
                            ))
                        ) : (
                            <div className="text-center p-4 rounded-lg bg-muted/20 h-full flex items-center justify-center min-h-[100px]">
                                <p className="text-sm text-muted-foreground">Drop classes here</p>
                            </div>
                        )}
                    </SortableContext>
                </CardContent>
            </Card>
        </div>
    );
};


export default function Timetable({ onEdit }: { onEdit: (slot: TimeSlot) => void }) {
  const { timetable, moveTimetableSlot } = useApp();
  const [activeSlot, setActiveSlot] = useState<TimeSlot | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollInterval = useRef<number | null>(null);

  const timetableByDay = useMemo(() => {
    const map = new Map<DayOfWeek, TimeSlot[]>();
    days.forEach(day => map.set(day, []));
    timetable.forEach(slot => {
      const daySlots = map.get(slot.day) || [];
      daySlots.push(slot);
    });
    // Sort slots within each day
    map.forEach((daySlots) => {
        daySlots.sort((a,b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [timetable]);

  const sensors = useSensors(useSensor(PointerSensor, {
      activationConstraint: {
          distance: 8,
      },
  }));
  
  const handleDragStart = (event: DragStartEvent) => {
      const { active } = event;
      const slot = timetable.find(s => s.id === active.id);
      if (slot) {
          setActiveSlot(slot);
      }
  };

  const handleDragOver = (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeDay = active.data.current?.day as DayOfWeek;
      const overDay = over.data.current?.day as DayOfWeek || over.id as DayOfWeek;

      if (activeDay !== overDay && days.includes(overDay)) {
          moveTimetableSlot(active.id as string, overDay, 0);
      }
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { delta } = event;
    const container = scrollContainerRef.current;
    if (!container) return;

    const { x } = delta;
    const { left, right, width } = container.getBoundingClientRect();
    const cursorX = left + x;
    const scrollAmount = 15;
    const edgeSize = 50;

    stopAutoScroll();

    if (cursorX < left + edgeSize) {
      autoScrollInterval.current = window.setInterval(() => {
        container.scrollLeft -= scrollAmount;
      }, 50);
    } else if (cursorX > right - edgeSize) {
      autoScrollInterval.current = window.setInterval(() => {
        container.scrollLeft += scrollAmount;
      }, 50);
    }
  }, []);
  
  const handleDragEnd = (event: DragEndEvent) => {
      stopAutoScroll();
      setActiveSlot(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      
      const activeDay = active.data.current?.day as DayOfWeek;
      const overDay = over.data.current?.day as DayOfWeek;

      if (activeDay !== overDay) {
          // The move is already handled by dragOver, this just finalizes it.
      }
  };


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
    <div ref={scrollContainerRef} className="w-full overflow-x-auto">
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={stopAutoScroll}
        >
            <div className="flex gap-4 p-1 min-h-[500px]">
                {days.map((day) => (
                    <DayColumn 
                        key={day} 
                        day={day} 
                        slots={timetableByDay.get(day) || []}
                        onEdit={onEdit}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeSlot ? <DraggableTimeSlot slot={activeSlot} onEdit={onEdit} /> : null}
            </DragOverlay>
        </DndContext>
    </div>
  );
}
