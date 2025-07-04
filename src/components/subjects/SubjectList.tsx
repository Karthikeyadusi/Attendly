
"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, BookHeart } from "lucide-react";
import type { Subject } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SubjectList({ onEdit }: { onEdit: (subject: Subject) => void; }) {
    const { subjects, deleteSubject } = useApp();

    if (subjects.length === 0) {
        return (
            <Card className="h-48">
                <CardHeader className="flex flex-col items-center justify-center text-center h-full">
                    <BookHeart className="w-12 h-12 text-primary mb-4" />
                    <CardTitle className="text-xl">No Subjects Yet</CardTitle>
                    <CardDescription>
                        Click "Add Subject" to create your first course.
                    </CardDescription>
                </CardHeader>
            </Card>
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
                                <CardDescription>{subject.type} • {subject.credits} {subject.credits === 1 ? 'Credit' : 'Credits'}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
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
        </div>
    );
}
