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
import { useEffect } from "react";
import { DatePicker } from "../ui/date-picker";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  conductedCredits: z.coerce.number().min(0, "Must be 0 or more"),
  attendedCredits: z.coerce.number().min(0, "Must be 0 or more"),
}).refine(data => data.attendedCredits <= data.conductedCredits, {
    message: "Attended credits can't exceed conducted credits",
    path: ["attendedCredits"],
});

type FormValues = z.infer<typeof formSchema>;

interface HistoricalDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HistoricalDataDialog({ open, onOpenChange }: HistoricalDataDialogProps) {
  const { saveHistoricalData, historicalData, trackingStartDate } = useApp();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      conductedCredits: 0,
      attendedCredits: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        startDate: trackingStartDate ? new Date(trackingStartDate) : new Date(),
        conductedCredits: historicalData?.conductedCredits ?? 0,
        attendedCredits: historicalData?.attendedCredits ?? 0,
      });
    }
  }, [open, historicalData, trackingStartDate, form]);

  const onSubmit = (values: FormValues) => {
    saveHistoricalData({
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      conductedCredits: values.conductedCredits,
      attendedCredits: values.attendedCredits,
    });
    toast({
        title: "History Saved",
        description: "Your attendance stats have been updated.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Historical Data</DialogTitle>
          <DialogDescription>
            Enter past attendance totals before you started tracking daily.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 p-0 md:p-0">
                <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Daily Tracking Start Date</FormLabel>
                    <DatePicker date={field.value} onSelect={field.onChange} />
                    <FormMessage />
                    </FormItem>
                )}
                />

                <p className="text-sm text-muted-foreground pt-2">Enter the total credits conducted and attended for all subjects combined before this date.</p>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="conductedCredits"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Total Conducted Credits</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
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
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
            <DialogFooter className="pt-6">
              <Button type="submit">Save History</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
