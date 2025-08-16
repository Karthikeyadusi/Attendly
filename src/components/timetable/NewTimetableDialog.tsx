
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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, History } from "lucide-react";
import { Label } from "@/components/ui/label";

interface NewTimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewTimetableDialog({ open, onOpenChange }: NewTimetableDialogProps) {
  const { setNewTimetable } = useApp();
  const { toast } = useToast();
  const [newStartDate, setNewStartDate] = useState<Date | undefined>(undefined);

  const handleConfirm = () => {
    if (!newStartDate) return;

    const newDateString = format(newStartDate, 'yyyy-MM-dd');
    setNewTimetable(newDateString);

    toast({
      title: "Timetable Reset!",
      description: `The weekly timetable is now empty and ready for your new schedule starting ${format(newStartDate, 'PPP')}.`,
    });
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        setNewStartDate(undefined);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a New Weekly Timetable</DialogTitle>
          <DialogDescription>
            This will lock in your past attendance and clear the current weekly schedule, letting you start fresh from a specific date.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>When does the new timetable start?</Label>
              <DatePicker 
                  date={newStartDate} 
                  onSelect={setNewStartDate}
                  disabled={(day) => isBefore(day, startOfToday())}
              />
            </div>
            
             <Alert>
                <History className="h-4 w-4" />
                <AlertTitle>How this works:</AlertTitle>
                <AlertDescription>
                    All attendance you've logged before the start date will be permanently saved. Your overall subject stats will continue seamlessly.
                </AlertDescription>
             </Alert>
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    Your current weekly timetable will be completely cleared. This action cannot be undone.
                </AlertDescription>
             </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!newStartDate}>Confirm and Clear Timetable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
