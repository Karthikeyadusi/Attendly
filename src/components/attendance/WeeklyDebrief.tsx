
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useApp } from '@/components/AppProvider';
import { generateWeeklyDebrief, type WeeklyDebriefOutput } from '@/ai/flows/weekly-debrief-flow';
import { subDays, format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Sparkles, BarChart2 } from 'lucide-react';
import { Progress } from '../ui/progress';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyDebrief() {
    const { userName, attendance, subjects, timetable, oneOffSlots } = useApp();
    const [debrief, setDebrief] = useState<WeeklyDebriefOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
    const slotMap = useMemo(() => new Map([...timetable, ...oneOffSlots].map(s => [s.id, s])), [timetable, oneOffSlots]);
    
    useEffect(() => {
        const fetchDebrief = async () => {
            setIsLoading(true);
            setError(null);

            const today = new Date();
            const weekEndDate = format(today, 'yyyy-MM-dd');
            const weekStartDate = format(subDays(today, 6), 'yyyy-MM-dd');

            const weeklyRecords = attendance.filter(r => r.date >= weekStartDate && r.date <= weekEndDate);

            const mapRecordToClassInfo = (r: (typeof weeklyRecords)[0]) => {
                const slot = slotMap.get(r.slotId);
                const subject = subjectMap.get(slot?.subjectId || '');
                // Robust date parsing to avoid timezone issues.
                // Reconstruct date from parts to ensure it's interpreted in the local timezone.
                const [year, month, day] = r.date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                return { 
                    subjectName: subject?.name || 'Unknown', 
                    day: dayNames[localDate.getDay()] 
                };
            };

            const attendedClasses = weeklyRecords
                .filter(r => r.status === 'Attended')
                .map(mapRecordToClassInfo)
                .filter(r => r.subjectName !== 'Unknown');

            const missedClasses = weeklyRecords
                .filter(r => r.status === 'Absent')
                .map(mapRecordToClassInfo)
                .filter(r => r.subjectName !== 'Unknown');

            const cancelledClasses = weeklyRecords
                .filter(r => r.status === 'Cancelled')
                .map(mapRecordToClassInfo)
                .filter(r => r.subjectName !== 'Unknown');

            if (attendedClasses.length === 0 && missedClasses.length === 0) {
                 setError("No attendance was logged this past week, so there's nothing to report. Let's get tracking this week!");
                 setIsLoading(false);
                 return;
            }

            try {
                const result = await generateWeeklyDebrief({
                    userName: userName || undefined,
                    weekStartDate,
                    weekEndDate,
                    attendedClasses,
                    missedClasses,
                    cancelledClasses
                });
                setDebrief(result);
            } catch (e) {
                console.error("Failed to generate weekly debrief:", e);
                setError("Couldn't generate your weekly summary. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDebrief();
    }, [userName, attendance, subjectMap, slotMap]);
    
    if (isLoading) {
        return (
            <div className="space-y-4 p-4 border rounded-lg bg-card-foreground/5">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="flex flex-col items-center justify-center text-center h-32 text-muted-foreground">
                <BarChart2 className="w-8 h-8 mb-2" />
                <p className="font-semibold text-card-foreground">Weekly Report</p>
                <p className="text-sm px-4">{error}</p>
            </div>
         );
    }

    if (!debrief) return null;

    const progressColor = debrief.attendancePercentage >= 75 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-card to-secondary">
            <div className="flex items-center gap-3 text-primary">
                <Sparkles className="w-6 h-6" />
                <h3 className="font-bold text-lg">{debrief.headline}</h3>
            </div>
            <p className="text-muted-foreground">{debrief.summary}</p>
            <div className="space-y-2">
                 <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground">Weekly Attendance</span>
                    <span style={{ color: progressColor }}>
                        {debrief.attendancePercentage.toFixed(1)}%
                    </span>
                </div>
                <Progress value={debrief.attendancePercentage} indicatorClassName={debrief.attendancePercentage < 75 ? 'bg-destructive' : undefined} />
            </div>
        </div>
    );
}
