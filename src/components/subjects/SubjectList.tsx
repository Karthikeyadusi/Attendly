
"use client";

import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, BookHeart } from "lucide-react";
import type { Subject } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "../ui/progress";

export default function SubjectList({ onEdit }: { onEdit: (subject: Subject) => void; }) {
    const { subjects, deleteSubject, subjectStats, minAttendancePercentage } = useApp();

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
            {subjects.map((subject) => {
                const stats = subjectStats.get(subject.id);
                const percentage = stats ? stats.percentage : 100;
                
                let helperMessage = null;
                if (stats && stats.conductedClasses > 0) {
                    const minAtt = minAttendancePercentage;
                    if (percentage < minAtt) {
                        const classesToAttend = Math.ceil((minAtt / 100 * stats.conductedClasses - stats.attendedClasses) / (1 - minAtt / 100));
                        if (classesToAttend > 0) {
                            helperMessage = `📈 Attend ${classesToAttend} more class${classesToAttend > 1 ? 'es' : ''} to reach ${minAtt}%`;
                        }
                    } else if (percentage > minAtt) {
                        const classesCanMiss = Math.floor((stats.attendedClasses - minAtt / 100 * stats.conductedClasses) / (minAtt / 100));
                        if (classesCanMiss > 0) {
                            helperMessage = `✅ You're safe to miss ${classesCanMiss} more class${classesCanMiss > 1 ? 'es' : ''}`;
                        }
                    }
                }

                const progressColor = percentage >= minAttendancePercentage ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

                return (
                    <Card key={subject.id}>
                        <CardHeader className="p-4 sm:p-6 space-y-3">
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
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-muted-foreground">Attendance</span>
                                    <span style={{ color: progressColor }}>
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>
                                <Progress value={percentage} indicatorClassName={percentage < minAttendancePercentage ? 'bg-destructive' : undefined} className="h-2" />
                                {helperMessage && (
                                     <p className="text-xs text-muted-foreground text-right pt-1">{helperMessage}</p>
                                )}
                            </div>
                        </CardHeader>
                    </Card>
                );
            })}
        </div>
    );
}
