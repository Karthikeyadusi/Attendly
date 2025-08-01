
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApp } from "@/components/AppProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "../ui/date-picker";
import { useEffect } from "react";
import { format, subDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { HelpCircle } from "lucide-react";


const historicalDataSchema = z.object({
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  conductedCredits: z.coerce.number().min(0, "Credits must be 0 or more."),
  attendedCredits: z.coerce.number().min(0, "Credits must be 0 or more."),
}).refine(data => data.attendedCredits <= data.conductedCredits, {
    message: "Attended credits cannot be more than conducted credits.",
    path: ["attendedCredits"],
});

type HistoricalDataValues = z.infer<typeof historicalDataSchema>;

interface HistoricalDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HistoricalDataDialog({ open, onOpenChange }: HistoricalDataDialogProps) {
  const { saveHistoricalData, trackingStartDate, historicalData } = useApp();

  const form = useForm<HistoricalDataValues>({
    resolver: zodResolver(historicalDataSchema),
    defaultValues: {
      startDate: subDays(new Date(), 30),
      conductedCredits: 0,
      attendedCredits: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (trackingStartDate && historicalData) {
        form.reset({
          startDate: new Date(trackingStartDate),
          conductedCredits: historicalData.conductedCredits,
          attendedCredits: historicalData.attendedCredits,
        });
      } else {
        form.reset({
          startDate: subDays(new Date(), 30),
          conductedCredits: 0,
          attendedCredits: 0,
        });
      }
    }
  }, [open, trackingStartDate, historicalData, form]);

  const onSubmit = (values: HistoricalDataValues) => {
    saveHistoricalData({
        startDate: format(values.startDate, 'yyyy-MM-dd'),
        conductedCredits: values.conductedCredits,
        attendedCredits: values.attendedCredits,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Historical Attendance</DialogTitle>
          <DialogDescription>
            True-up your stats with official figures. Data will be tracked from the start date you select.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Tracking Start Date</FormLabel>
                    <DatePicker 
                        date={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                    />
                    <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="conductedCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Conducted Credits</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 150" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="attendedCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Attended Credits</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 140" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>How does this work?</AlertTitle>
                <AlertDescription>
                    Enter your official attendance data up to a certain point. The app will use these numbers as a baseline and then start tracking your daily attendance from the "Start Date" you select.
                </AlertDescription>
            </Alert>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Save History</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

