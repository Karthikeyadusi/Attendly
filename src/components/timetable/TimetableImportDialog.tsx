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
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        setExtractedSlots(result.slots);
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Timetable with AI</DialogTitle>
          <DialogDescription>
            Upload a picture of your timetable, and we'll automatically add it to your schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
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
                <ScrollArea className="h-80 w-full rounded-md border p-2">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {!isLoading && extractedSlots.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p>Analysis results will appear here.</p>
                            <p className="text-xs">Subjects that don't exist will be created automatically.</p>
                        </div>
                    )}
                    {extractedSlots.length > 0 && (
                         <div className="space-y-2">
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
                </ScrollArea>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={extractedSlots.length === 0}>
            Save to Timetable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
