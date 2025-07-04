"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Info } from "lucide-react";
import SubjectForm from "./SubjectForm";
import { useState } from "react";
import type { Subject } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SubjectList({ onEdit }: { onEdit: (subject: Subject) => void; }) {
    const { subjects, deleteSubject } = useApp();
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const handleEditClick = (subject: Subject) => {
        setEditingSubject(subject);
        onEdit(subject);
    };

    if (subjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center h-48">
                <Info className="w-8 h-8 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold">No Subjects Yet</h3>
                <p className="text-sm text-muted-foreground">
                    Click "Add Subject" to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {subjects.map((subject) => (
                <Card key={subject.id}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle>{subject.name}</CardTitle>
                                <CardDescription>{subject.type} - {subject.credits} credits</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(subject)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the "{subject.name}" subject and all its related timetable and attendance records.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteSubject(subject.id)} className="bg-destructive hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            ))}
            {editingSubject && (
                 <SubjectForm
                    open={!!editingSubject}
                    onOpenChange={(isOpen) => !isOpen && setEditingSubject(null)}
                    subject={editingSubject}
                />
            )}
        </div>
    );
}
