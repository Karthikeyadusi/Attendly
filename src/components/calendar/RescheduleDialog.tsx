
"use client";

import { useState } from "react";
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

  const subject = subjectMap.get(slot.subjectId);
  const originalDate = 'date' in slot ? slot.date : date;

  const handleConfirm = () => {
    if (!newDate) return;
    const newDateString = format(newDate, 'yyyy-MM-dd');

    rescheduleClass(slot, originalDate, newDateString);
    toast({
      title: "Class Rescheduled",
      description: `${subject?.name || 'The class'} has been moved to ${format(newDate, 'PPP')}.`,
    });
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNewDate(undefined); // Reset date on close
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Class</DialogTitle>
          <DialogDescription>
            Select a new date for the <strong>{subject?.name}</strong> class originally on {format(new Date(originalDate + 'T00:00:00'), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <p className="text-sm font-medium">Select new date</p>
             <DatePicker 
                date={newDate} 
                onSelect={setNewDate}
                disabled={(day) => isBefore(day, startOfToday())}
             />
             <Alert>
                <CalendarClock className="h-4 w-4" />
                <AlertDescription>
                    The original class will be marked as "Postponed", and a new one-time class will be added to the selected date.
                </AlertDescription>
             </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!newDate}>Confirm Reschedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
