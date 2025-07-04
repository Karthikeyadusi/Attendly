"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import { ScrollArea } from "../ui/scroll-area";


const historicalRecordSchema = z.object({
  subjectId: z.string(),
  conducted: z.coerce.number().min(0, "Must be 0 or more"),
  attended: z.coerce.number().min(0, "Must be 0 or more"),
}).refine(data => data.attended <= data.conducted, {
    message: "Attended can't exceed conducted",
    path: ["attended"],
});

const formSchema = z.object({
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  records: z.array(historicalRecordSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface HistoricalDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HistoricalDataDialog({ open, onOpenChange }: HistoricalDataDialogProps) {
  const { subjects, saveHistoricalData, historicalData, trackingStartDate } = useApp();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: trackingStartDate ? new Date(trackingStartDate) : new Date(),
      records: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "records",
  });

  useEffect(() => {
    if (open) {
      const initialRecords = subjects.map(subject => {
        const existingRecord = historicalData.find(h => h.subjectId === subject.id);
        return {
          subjectId: subject.id,
          conducted: existingRecord?.conducted ?? 0,
          attended: existingRecord?.attended ?? 0,
        };
      });
      replace(initialRecords);
      form.reset({
        startDate: trackingStartDate ? new Date(trackingStartDate) : new Date(),
        records: initialRecords,
      });
    }
  }, [open, subjects, historicalData, trackingStartDate, form, replace]);

  const onSubmit = (values: FormValues) => {
    saveHistoricalData({
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      records: values.records,
    });
    toast({
        title: "History Saved",
        description: "Your attendance stats have been updated.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 md:p-6 pb-4 border-b">
          <DialogTitle>Import Historical Data</DialogTitle>
          <DialogDescription>
            Enter past attendance totals before you started tracking daily.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] p-4 md:p-6">
                <div className="space-y-4">
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

                    <div className="space-y-4">
                        {fields.map((field, index) => {
                            const subject = subjects.find(s => s.id === field.subjectId);
                            return (
                                <div key={field.id} className="p-3 border rounded-lg">
                                    <h4 className="font-semibold mb-2">{subject?.name || 'Unknown Subject'}</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`records.${index}.conducted`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Conducted</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`records.${index}.attended`}
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Attended</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="p-4 md:p-6 pt-4 border-t">
              <Button type="submit">Save History</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
