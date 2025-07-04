"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BookCopy, CalendarPlus } from "lucide-react";
import { useApp } from "./AppProvider";
import { Logo } from "./Logo";

export default function Onboarding() {
  const { subjects } = useApp();

  const hasSubjects = subjects.length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <Logo className="w-12 h-12 text-primary mb-2" />
        <CardTitle className="text-2xl">Welcome to Attendly!</CardTitle>
        <CardDescription>
          Let's get you set up for tracking your attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
            <Link href="/subjects" className="w-full">
                <Button variant={hasSubjects ? "outline" : "default"} className="w-full">
                    <BookCopy className="mr-2 h-4 w-4" />
                    {hasSubjects ? 'Manage Subjects' : '1. Add Your Subjects'}
                </Button>
            </Link>
            <Link href="/timetable" className="w-full">
                <Button variant={!hasSubjects ? "outline" : "default"} disabled={!hasSubjects} className="w-full">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    2. Build Your Timetable
                </Button>
            </Link>
        </div>
        {!hasSubjects && (
             <p className="text-xs text-center text-muted-foreground pt-2">
                Start by adding your subjects. You'll need them to build your timetable.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
