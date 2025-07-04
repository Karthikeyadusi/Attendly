
"use client";

import { useApp } from "@/components/AppProvider";
import Timetable from "@/components/timetable/Timetable";
import TimetableSlotForm from "@/components/timetable/TimetableSlotForm";
import TimetableImportDialog from "@/components/timetable/TimetableImportDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import { Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimeSlot } from "@/types";

export default function TimetablePage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
    const { subjects, isLoaded } = useApp();

    const handleAddSlot = () => {
        setEditingSlot(null);
        setIsFormOpen(true);
    };

    const handleEditSlot = (slot: TimeSlot) => {
        setEditingSlot(slot);
        setIsFormOpen(true);
    };

    const handleFormOpenChange = (open: boolean) => {
        if (!open) {
            setEditingSlot(null);
        }
        setIsFormOpen(open);
    };

    if (!isLoaded) {
      return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    
    if (subjects.length === 0) {
        return (
             <Card className="w-full mt-8">
                <CardHeader className="items-center text-center">
                    <Info className="w-12 h-12 text-primary mb-2" />
                    <CardTitle className="text-xl">Add Subjects First</CardTitle>
                    <CardDescription>
                        You need to add subjects before you can build your timetable.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Link href="/subjects">
                        <Button>Go to Subjects</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Weekly Timetable</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => setIsImportOpen(true)} variant="outline">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Import with AI
                    </Button>
                    <Button onClick={handleAddSlot}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Class
                    </Button>
                </div>
            </div>
            
            <Timetable onEdit={handleEditSlot} />
            
            <TimetableSlotForm 
              open={isFormOpen} 
              onOpenChange={handleFormOpenChange}
              slot={editingSlot}
            />
            <TimetableImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
        </div>
    );
}
