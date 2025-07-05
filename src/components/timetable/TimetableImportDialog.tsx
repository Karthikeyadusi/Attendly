
"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { extractTimetable } from "@/ai/flows/extract-timetable-flow";
import { useApp } from "../AppProvider";
import { Loader2, Upload, Trash2, Sparkles } from "lucide-react";
import type { ExtractedSlot, DayOfWeek } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { addMinutes, parse, format as formatDate } from 'date-fns';

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type RawExtractedSlot = {
    day: DayOfWeek;
    startTime: string;
    subjectName: string;
};

const processRawSlots = (rawSlots: RawExtractedSlot[]): ExtractedSlot[] => {
    // Helper function to fix inconsistent time formats from the AI.
    const normalizeTime = (timeStr: string): string => {
        try {
            if (!timeStr) return "00:00";
            timeStr = timeStr.replace('.', ':').trim();
            const isPM = timeStr.toLowerCase().includes('pm');
            const isAM = timeStr.toLowerCase().includes('am');
            timeStr = timeStr.replace(/am|pm/i, '').trim();

            let [hourStr, minuteStr] = timeStr.split(':');
            if (!hourStr || !minuteStr) return timeStr;

            let hour = parseInt(hourStr, 10);
            if (isNaN(hour)) return timeStr;

            // Simple heuristic for 12-hour format without AM/PM
            if (!isPM && !isAM && hour >= 1 && hour <= 7) { 
                hour += 12;
            } else if (isPM && hour < 12) {
                hour += 12;
            } else if (isAM && hour === 12) {
                hour = 0; // Midnight case
            }
            
            let minute = parseInt(minuteStr, 10);
            if (isNaN(minute)) return timeStr;

            const h = String(hour).padStart(2, '0');
            const m = String(minute).padStart(2, '0');

            return `${h}:${m}`;
        } catch {
            return timeStr;
        }
    };
    
    // 1. Normalize times and filter out invalid slots
    const allSlotsNormalized = rawSlots
        .map(slot => ({ ...slot, startTime: normalizeTime(slot.startTime) }))
        .filter(slot => slot.day && slot.startTime && slot.subjectName && slot.startTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/));

    const slotsByDay = new Map<DayOfWeek, RawExtractedSlot[]>();

    // 2. Group ALL normalized slots by day
    for (const slot of allSlotsNormalized) {
        if (!slotsByDay.has(slot.day)) {
            slotsByDay.set(slot.day, []);
        }
        slotsByDay.get(slot.day)!.push(slot);
    }

    const timedSlots: ExtractedSlot[] = [];

    // 3. Calculate end times using the full schedule and hardcoded lunch rule
    for (const day of slotsByDay.keys()) {
        const daySlots = slotsByDay.get(day)!.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        for (let i = 0; i < daySlots.length; i++) {
            const currentSlot = daySlots[i];
            const nextSlot = i + 1 < daySlots.length ? daySlots[i + 1] : null;

            try {
                let endTime;
                const lunchStartTime = "12:20"; // The hardcoded rule

                if (nextSlot) {
                    // If the current class is before lunch and the next one is during or after, cap the end time.
                    if (currentSlot.startTime < lunchStartTime && nextSlot.startTime >= lunchStartTime) {
                        endTime = lunchStartTime;
                    } else {
                        endTime = nextSlot.startTime;
                    }
                } else {
                    // Last class of the day. If it's before lunch, cap it. Otherwise, use standard duration.
                    if (currentSlot.startTime < lunchStartTime) {
                        endTime = lunchStartTime;
                    } else {
                        const isLab = currentSlot.subjectName.toLowerCase().includes('lab');
                        const duration = isLab ? 100 : 50; 
                        endTime = formatDate(addMinutes(parse(currentSlot.startTime, 'HH:mm', new Date()), duration), 'HH:mm');
                    }
                }
                
                timedSlots.push({
                    day: currentSlot.day,
                    startTime: currentSlot.startTime,
                    endTime: endTime,
                    subjectName: currentSlot.subjectName.trim(),
                });
            } catch (e) {
                console.error("Error calculating end time:", currentSlot, e);
            }
        }
    }

    // 4. Merge consecutive slots that have the same subject name
    const mergedSlots: ExtractedSlot[] = [];
    const timedSlotsByDay = new Map<DayOfWeek, ExtractedSlot[]>();
    for (const slot of timedSlots) {
        if (!timedSlotsByDay.has(slot.day)) {
            timedSlotsByDay.set(slot.day, []);
        }
        timedSlotsByDay.get(slot.day)!.push(slot);
    }
    
    for (const day of timedSlotsByDay.keys()) {
        const daySlots = timedSlotsByDay.get(day)!.sort((a,b) => a.startTime.localeCompare(b.startTime));
        let i = 0;
        while (i < daySlots.length) {
            let currentSlot = { ...daySlots[i] };
            
            let j = i + 1;
            while (
                j < daySlots.length &&
                daySlots[j].subjectName.toLowerCase() === currentSlot.subjectName.toLowerCase() &&
                daySlots[j].startTime === currentSlot.endTime // Ensure they are perfectly consecutive
            ) {
                currentSlot.endTime = daySlots[j].endTime; // Extend the end time
                j++;
            }
            
            mergedSlots.push(currentSlot);
            i = j; // Move index past all merged slots
        }
    }
    
    // 5. NOW filter out purely structural slots like 'LUNCH' or 'BREAK'
    const structuralKeywords = ['lunch', 'break'];
    const finalSchedule = mergedSlots.filter(slot => 
      !structuralKeywords.some(keyword => slot.subjectName.toLowerCase().includes(keyword))
    );

    // Return sorted by day, then time
    return finalSchedule.sort((a,b) => {
        if (a.day !== b.day) return days.indexOf(a.day) - days.indexOf(b.day);
        return a.startTime.localeCompare(b.startTime);
    });
};


export default function TimetableImportDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { importTimetable } = useApp();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedSlots, setExtractedSlots] = useState<ExtractedSlot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImagePreview(null);
    setImageData(null);
    setIsLoading(false);
    setExtractedSlots([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(URL.createObjectURL(file));
        setImageData(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageData) return;
    setIsLoading(true);
    setExtractedSlots([]);
    try {
      const result = await extractTimetable({ photoDataUri: imageData });
      if (result && result.slots.length > 0) {
        const processed = processRawSlots(result.slots);
        setExtractedSlots(processed);
      } else {
        toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: "Could not extract any timetable data. Please try another image.",
        });
      }
    } catch (error) {
      console.error("Timetable extraction failed:", error);
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Failed to analyze the timetable image. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSlotChange = (index: number, field: keyof ExtractedSlot, value: string) => {
      const newSlots = [...extractedSlots];
      newSlots[index] = { ...newSlots[index], [field]: value };
      setExtractedSlots(newSlots);
  };

  const removeSlot = (index: number) => {
      setExtractedSlots(extractedSlots.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    importTimetable(extractedSlots);
    toast({
        title: "Timetable Imported!",
        description: "Your schedule has been updated with the new classes.",
    });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 max-h-[90dvh] flex flex-col">
        <DialogHeader className="p-4 md:p-6 pb-4 border-b">
          <DialogTitle>Import Timetable with AI</DialogTitle>
          <DialogDescription>
            Upload a picture of your timetable, and we'll automatically add it to your schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 gap-6 overflow-y-auto p-4 lg:grid-cols-2 md:p-6 min-h-0">
            {/* Left side: Upload */}
            <div className="space-y-4">
                 <Label htmlFor="timetable-upload">Timetable Image</Label>
                 <div 
                    className="relative w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                 >
                    {imagePreview ? (
                        <Image src={imagePreview} alt="Timetable preview" fill={true} className="rounded-lg object-contain" />
                    ) : (
                        <div className="text-center">
                            <Upload className="mx-auto h-12 w-12" />
                            <p>Click to upload or drag & drop</p>
                        </div>
                    )}
                 </div>
                <Input id="timetable-upload" ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <Button onClick={handleAnalyze} disabled={!imageData || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />}
                    {isLoading ? "Analyzing..." : "Analyze Timetable"}
                </Button>
            </div>

            {/* Right side: Preview */}
            <div className="space-y-4">
                <Label>Extracted Classes</Label>
                <div className="w-full rounded-md border min-h-[280px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full p-4">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !isLoading && extractedSlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                            <p>Analysis results will appear here.</p>
                            <p className="text-xs">Subjects not already in your list will be created automatically.</p>
                        </div>
                    ) : (
                         <div className="space-y-2 p-2">
                             {extractedSlots.map((slot, index) => (
                                 <div key={index} className="p-2 border rounded-lg space-y-2">
                                     <div className="flex justify-between items-center">
                                         <Input value={slot.subjectName} onChange={e => handleSlotChange(index, 'subjectName', e.target.value)} placeholder="Subject Name" className="font-semibold text-base" />
                                         <Button variant="ghost" size="icon" onClick={() => removeSlot(index)}>
                                             <Trash2 className="h-4 w-4 text-destructive" />
                                         </Button>
                                     </div>
                                     <div className="grid grid-cols-3 gap-2">
                                         <Select value={slot.day} onValueChange={value => handleSlotChange(index, 'day', value)}>
                                             <SelectTrigger><SelectValue/></SelectTrigger>
                                             <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                         </Select>
                                         <Input type="time" value={slot.startTime} onChange={e => handleSlotChange(index, 'startTime', e.target.value)} />
                                         <Input type="time" value={slot.endTime} onChange={e => handleSlotChange(index, 'endTime', e.target.value)} />
                                     </div>
                                 </div>
                             ))}
                         </div>
                    )}
                </div>
                {extractedSlots.length > 0 && (
                    <Alert>
                        <AlertTitle>Review Carefully</AlertTitle>
                        <AlertDescription>
                            Please check the extracted data for accuracy. Subjects not already in your list will be created automatically.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>

        <DialogFooter className="p-4 md:p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={extractedSlots.length === 0}>
            Save to Timetable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
