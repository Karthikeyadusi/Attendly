
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
import { useApp } from "../AppProvider";
import { Loader2, Upload, Trash2, ScanText, AlertCircle } from "lucide-react";
import type { ExtractedSlot, DayOfWeek } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { parseOcrText, processRawSlots } from "@/lib/ocrParser";
import { Progress } from "../ui/progress";

const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const NEW_SUBJECT_ID_PREFIX = 'new-subject_';

type MappedExtractedSlot = ExtractedSlot & {
    subjectIdOrName: string;
};


export default function TimetableImportDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { importTimetable, subjects } = useApp();
  const { toast } = useToast();
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedSlots, setExtractedSlots] = useState<MappedExtractedSlot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFilePreview(null);
    setImageFile(null);
    setIsLoading(false);
    setOcrProgress(0);
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
      if (!file.type.startsWith('image/')) {
        toast({
            variant: "destructive",
            title: "Unsupported File Type",
            description: "Please upload a valid image file (JPG, PNG, WEBP, etc.).",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFilePreview(URL.createObjectURL(file));
      setImageFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setOcrProgress(0);
    setExtractedSlots([]);

    try {
      // Dynamically import Tesseract.js to avoid adding it to the initial bundle
      const Tesseract = await import('tesseract.js');

      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round((m.progress ?? 0) * 100));
          }
        },
      });

      const rawText = result.data.text;

      if (!rawText.trim()) {
        toast({
          variant: 'destructive',
          title: 'No Text Detected',
          description: 'OCR could not find any text. Try a clearer, higher-resolution image.',
        });
        return;
      }

      // Parse the OCR text into raw slots, then process them
      const rawSlots = parseOcrText(rawText);
      const processed = processRawSlots(rawSlots);

      if (processed.length > 0) {
        const mapped: MappedExtractedSlot[] = processed.map(p => {
          const existingSubject = subjects.find(s => s.name.toLowerCase() === p.subjectName.toLowerCase());
          return {
            ...p,
            subjectIdOrName: existingSubject ? existingSubject.id : `${NEW_SUBJECT_ID_PREFIX}${p.subjectName}`,
          };
        });
        setExtractedSlots(mapped);
        toast({ title: 'Scan Complete', description: `Found ${processed.length} class slot${processed.length !== 1 ? 's' : ''}. Review below.` });
      } else {
        toast({
          variant: 'destructive',
          title: 'No Classes Found',
          description: 'OCR ran successfully but no timetable structure was detected. Try a cleaner image or add slots manually.',
        });
      }
    } catch (error) {
      console.error('OCR failed:', error);
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: 'Something went wrong during OCR. Please try again with a different image.',
      });
    } finally {
      setIsLoading(false);
      setOcrProgress(0);
    }
  };
  
  const handleSlotChange = (index: number, field: keyof MappedExtractedSlot, value: string | number) => {
      const newSlots = [...extractedSlots];
      const slot = { ...newSlots[index] };
      (slot as any)[field] = value;
      newSlots[index] = slot;
      setExtractedSlots(newSlots);
  };

  const handleSubjectMappingChange = (index: number, value: string) => {
    if (value.startsWith(NEW_SUBJECT_ID_PREFIX)) {
      const newSubjectName = value.substring(NEW_SUBJECT_ID_PREFIX.length);
      handleSlotChange(index, 'subjectName', newSubjectName);
    }
    handleSlotChange(index, 'subjectIdOrName', value);
  };

  const removeSlot = (index: number) => {
      setExtractedSlots(extractedSlots.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // We need to convert MappedExtractedSlot back to ExtractedSlot for the import function
    const slotsToImport: ExtractedSlot[] = extractedSlots.map(s => {
        let subjectName: string;
        if (s.subjectIdOrName.startsWith(NEW_SUBJECT_ID_PREFIX)) {
            subjectName = s.subjectName;
        } else {
            const existingSubject = subjects.find(sub => sub.id === s.subjectIdOrName);
            subjectName = existingSubject?.name || s.subjectName;
        }
        return {
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            credits: s.credits,
            subjectName: subjectName,
        };
    });

    importTimetable(slotsToImport);
    toast({
        title: "Timetable Imported!",
        description: "Your schedule has been updated with the new classes.",
    });
    handleClose(false);
  };
  
  const renderFilePreview = () => {
    if (filePreview) {
        return <Image src={filePreview} alt="Timetable preview" fill={true} className="rounded-lg object-contain" />;
    }
    return (
        <div className="text-center">
            <Upload className="mx-auto h-12 w-12" />
            <p>Click to upload an image</p>
        </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 max-h-[90dvh] flex flex-col">
        <DialogHeader className="p-4 md:p-6 pb-4 border-b">
          <DialogTitle>Import Timetable via OCR</DialogTitle>
          <DialogDescription>
            Upload a photo of your printed timetable. The scanner will extract classes automatically.
            You can map detected subjects to existing ones to preserve attendance history.
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
                    {renderFilePreview()}
                 </div>
                <Input id="timetable-upload" ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                <Button onClick={handleAnalyze} disabled={!imageFile || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : <ScanText className="mr-2" />}
                    {isLoading ? `Scanning... ${ocrProgress}%` : 'Scan Timetable'}
                </Button>
                {isLoading && ocrProgress > 0 && (
                    <Progress value={ocrProgress} className="h-1" />
                )}
            </div>

            {/* Right side: Preview */}
            <div className="space-y-4">
                <Label>Extracted Classes</Label>
                <div className="w-full rounded-md border min-h-[280px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full p-4 gap-2">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                           <p className="text-sm text-muted-foreground">Running OCR on your image...</p>
                        </div>
                    ) : !isLoading && extractedSlots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                            <p>Scan results will appear here.</p>
                            <p className="text-xs">You can map detected subjects to your existing ones.</p>
                        </div>
                    ) : (
                         <div className="space-y-2 p-2">
                             {extractedSlots.map((slot, index) => (
                                 <div key={index} className="p-2 border rounded-lg space-y-2">
                                     <div className="flex justify-between items-start gap-2">
                                        <div className="flex-grow space-y-2">
                                          <Select value={slot.subjectIdOrName} onValueChange={value => handleSubjectMappingChange(index, value)}>
                                              <SelectTrigger className="font-semibold text-base">
                                                  <SelectValue placeholder="Select or create subject..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value={`${NEW_SUBJECT_ID_PREFIX}${slot.subjectName}`}>
                                                      Create new: "{slot.subjectName}"
                                                  </SelectItem>
                                                  {subjects.map(s => (
                                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          {slot.subjectIdOrName.startsWith(NEW_SUBJECT_ID_PREFIX) && (
                                              <Input 
                                                value={slot.subjectName} 
                                                onChange={e => handleSlotChange(index, 'subjectName', e.target.value)} 
                                                placeholder="Subject Name" 
                                              />
                                          )}
                                        </div>
                                         <Button variant="ghost" size="icon" onClick={() => removeSlot(index)}>
                                             <Trash2 className="h-4 w-4 text-destructive" />
                                         </Button>
                                     </div>
                                     <div className="grid grid-cols-4 gap-2">
                                         <Select value={slot.day} onValueChange={value => handleSlotChange(index, 'day', value)}>
                                             <SelectTrigger><SelectValue/></SelectTrigger>
                                             <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                         </Select>
                                         <Input type="time" value={slot.startTime} onChange={e => handleSlotChange(index, 'startTime', e.target.value)} />
                                         <Input type="time" value={slot.endTime} onChange={e => handleSlotChange(index, 'endTime', e.target.value)} />
                                         <Input type="number" value={slot.credits} onChange={e => handleSlotChange(index, 'credits', parseInt(e.target.value, 10) || 0)} />
                                     </div>
                                 </div>
                             ))}
                         </div>
                    )}
                </div>
                {extractedSlots.length > 0 && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Review Carefully</AlertTitle>
                        <AlertDescription>
                            For each class, either create a new subject or map it to an existing one to keep your history.
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
