'use server';
/**
 * @fileOverview An AI flow to extract timetable information from an image.
 *
 * - extractTimetable - A function that handles parsing a timetable image.
 * - ExtractTimetableInput - The input type for the extractTimetable function.
 * - ExtractTimetableOutput - The return type for the extractTimetable function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { DayOfWeek } from '@/types';

const days: [DayOfWeek, ...DayOfWeek[]] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ExtractTimetableInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a timetable, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTimetableInput = z.infer<typeof ExtractTimetableInputSchema>;

const ExtractedSlotSchema = z.object({
  day: z.enum(days).describe("Day of the week (must be one of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')."),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("The start time of the class in 24-hour HH:MM format."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("The end time of the class in 24-hour HH:MM format."),
  subjectName: z.string().describe('The name of the subject or course.'),
});

const ExtractTimetableOutputSchema = z.object({
  slots: z.array(ExtractedSlotSchema),
});
export type ExtractTimetableOutput = z.infer<typeof ExtractTimetableOutputSchema>;

export async function extractTimetable(input: ExtractTimetableInput): Promise<ExtractTimetableOutput> {
  return extractTimetableFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTimetablePrompt',
  input: {schema: ExtractTimetableInputSchema},
  output: {schema: ExtractTimetableOutputSchema},
  prompt: `You are an intelligent timetable parser. Analyze the provided image of a college timetable. Your task is to extract all class schedules and return them in a structured JSON format.

  Carefully follow these instructions:
  - Identify the subject name, the day of the week, and the start and end times for each class.
  - The days of the week MUST be one of: 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'.
  - Times MUST be in 24-hour HH:MM format. Convert AM/PM times to 24-hour format. For example, 2 PM is 14:00.
  - CRITICAL LOGIC FOR END TIMES: Many timetables only show a subject at its starting time slot. To determine the end time, you must look ahead to the next scheduled class on the SAME DAY. The end time for one class is the start time of the next class. For example, if on Monday, "Math" starts at 09:00 and the next class, "History", starts at 10:40, then the time slot for "Math" is 09:00-10:40. If a class is the last one of the day, assume a standard duration of 50 minutes.
  - Make your best effort to parse all entries. If some information is ambiguous, make a reasonable guess. It is critical that the output matches the specified JSON schema exactly.
  - Ensure that for every slot, the end time is after the start time.

  Image to analyze: {{media url=photoDataUri}}`,
});

const extractTimetableFlow = ai.defineFlow(
  {
    name: 'extractTimetableFlow',
    inputSchema: ExtractTimetableInputSchema,
    outputSchema: ExtractTimetableOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output || { slots: [] };
  }
);
