
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
  prompt: `You are an expert AI timetable parser. Your task is to extract class schedule information from the provided image and return it in a structured JSON format.

While parsing the timetable, extract all classes with accurate startTime and endTime. Many subjects appear as two consecutive 50-minute blocks (e.g., "FLAT" at 09:00 and again at 09:50) but represent one logical class.

**Valid start times must include:**
- 09:00
- 10:40
- 1:30 PM

**Rules:**
1.  **Time Conversion:** You must convert all times to 24-hour HH:MM format (e.g., "1:30 PM" becomes "13:30").
2.  **Merge Consecutive Subjects:** If the same subject appears in two consecutive slots on the same day, you must merge them into one. For example, if 'FLAT' is at 09:00 and 09:50, the result is a single entry with startTime: "09:00" and endTime: "10:40".
3.  **Afternoon Class End Time:** Afternoon classes (starting at 1:30 PM / 13:30) should end at the start of the next block if one is available on the same day (e.g., if next class is at 3:10 PM, end time is 15:10). If it's the last class of the day, default to a 100-minute duration, making the end time 15:10.
4.  **Ignore Duplicates:** You must ignore duplicate entries after merging them.

Follow these rules precisely.

Image to analyze: {{media url=photoDataUri}}`,
});

const extractTimetableFlow = ai.defineFlow(
  {
    name: 'extractTimetableFlow',
    inputSchema: ExtractTimetableInputSchema,
    outputSchema: ExtractTimetableOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
