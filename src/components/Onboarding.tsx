
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BookCopy, Sparkles } from "lucide-react";
import { Logo } from "./Logo";

export default function Onboarding() {

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <Logo className="w-12 h-12 text-primary mb-2" />
        <CardTitle className="text-2xl">Welcome to Attendly!</CardTitle>
        <CardDescription>
          The fastest way to get started is to import your timetable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
            <Link href="/timetable" className="w-full">
                <Button className="w-full h-14 text-base">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Import Timetable with AI
                </Button>
            </Link>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        Or
                    </span>
                </div>
            </div>
            <Link href="/subjects" className="w-full">
                <Button variant="outline" className="w-full">
                    <BookCopy className="mr-2 h-4 w-4" />
                    Set Up Manually
                </Button>
            </Link>
        </div>
        <p className="text-xs text-center text-muted-foreground pt-2">
          When you import with AI, any new subjects will be created for you.
        </p>
      </CardContent>
    </Card>
  );
}
