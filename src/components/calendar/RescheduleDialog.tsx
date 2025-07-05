
"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DatePicker } from "../ui/date-picker";
import { format, isBefore, startOfToday } from "date-fns";
import type { OneOffSlot, TimeSlot } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "../ui/alert";
import { CalendarClock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: TimeSlot | OneOffSlot;
  date: string;
}

export default function RescheduleDialog({ open, onOpenChange, slot, date }: RescheduleDialogProps) {
  const { rescheduleClass, subjectMap } = useApp();
  const { toast } = useToast();
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newStartTime, setNewStartTime] = useState(slot.startTime);
  const [newEndTime, setNewEndTime] = useState(slot.endTime);

  const subject = subjectMap.get(slot.subjectId);
  const originalDate = 'date' in slot ? slot.date : date;
  
  useEffect(() => {
    if (open) {
      setNewDate(undefined);
      setNewStartTime(slot.startTime);
      setNewEndTime(slot.endTime);
    }
  }, [open, slot]);

  const handleConfirm = () => {
    if (!newDate || !newStartTime || !newEndTime) return;

    if (newStartTime >= newEndTime) {
      toast({
        variant: "destructive",
        title: "Invalid Time",
        description: "End time must be after the start time.",
      });
      return;
    }

    const newDateString = format(newDate, 'yyyy-MM-dd');

    rescheduleClass(slot, originalDate, newDateString, newStartTime, newEndTime);
    toast({
      title: "Class Rescheduled",
      description: `${subject?.name || 'The class'} has been moved to ${format(newDate, 'PPP')}.`,
    });
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Class</DialogTitle>
          <DialogDescription>
            Select a new date and time for the <strong>{subject?.name}</strong> class originally on {format(new Date(originalDate + 'T00:00:00'), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select new date</Label>
              <DatePicker 
                  date={newDate} 
                  onSelect={setNewDate}
                  disabled={(day) => isBefore(day, startOfToday())}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input id="start-time" type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input id="end-time" type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} />
              </div>
            </div>

             <Alert>
                <CalendarClock className="h-4 w-4" />
                <AlertDescription>
                    The original class will be marked as "Postponed", and a new one-time class will be added to the selected date.
                </AlertDescription>
             </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!newDate || !newStartTime || !newEndTime}>Confirm Reschedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
