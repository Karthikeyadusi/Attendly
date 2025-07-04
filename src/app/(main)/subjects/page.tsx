"use client";

import { useApp } from "@/components/AppProvider";
import SubjectForm from "@/components/subjects/SubjectForm";
import SubjectList from "@/components/subjects/SubjectList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, History } from "lucide-react";
import { useState } from "react";
import HistoricalDataDialog from "@/components/subjects/HistoricalDataDialog";

export default function SubjectsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { isLoaded } = useApp();

    if (!isLoaded) {
      return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your Subjects</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => setIsHistoryOpen(true)} variant="outline">
                        <History className="mr-2 h-4 w-4" />
                        Import History
                    </Button>
                    <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Subject
                    </Button>
                </div>
            </div>

            <SubjectList onEdit={(subject) => setIsFormOpen(true)} />
            
            <SubjectForm open={isFormOpen} onOpenChange={setIsFormOpen} />
            <HistoricalDataDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} />
        </div>
    );
}
