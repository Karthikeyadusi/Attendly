
"use client";

import React from 'react';
import { useApp } from '@/components/AppProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArchivedSemester } from '@/types';
import SemesterView from './SemesterView';

interface SemesterViewDialogProps {
    archive: ArchivedSemester;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SemesterViewDialog({ archive, open, onOpenChange }: SemesterViewDialogProps) {
    const { subjectMap } = useApp();
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>History for: {archive.name}</DialogTitle>
                    <DialogDescription>
                        A snapshot of your attendance for this archived semester.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[70vh] overflow-y-auto">
                   <SemesterView 
                        isArchived={true}
                        archivedData={archive}
                        subjectMap={subjectMap}
                   />
                </div>
            </DialogContent>
        </Dialog>
    );
}
