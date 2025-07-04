
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

// The AI now returns raw, unprocessed slots. The end time will be calculated in the client.
const RawExtractedSlotSchema = z.object({
  day: z.enum(days).describe("Day of the week (must be one of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')."),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("The start time of the class in 24-hour HH:MM format."),
  subjectName: z.string().describe('The name of the subject or course.'),
});

const ExtractTimetableOutputSchema = z.object({
  slots: z.array(RawExtractedSlotSchema),
});
export type ExtractTimetableOutput = z.infer<typeof ExtractTimetableOutputSchema>;

export async function extractTimetable(input: ExtractTimetableInput): Promise<ExtractTimetableOutput> {
  return extractTimetableFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTimetablePrompt',
  input: {schema: ExtractTimetableInputSchema},
  output: {schema: ExtractTimetableOutputSchema},
  prompt: `You are an AI assistant. Your only task is to look at the timetable image and extract EVERY SINGLE block you see, including academic classes and other activities.

For each block, provide the following information:
1.  **day**: The day of the week ('Mon', 'Tue', etc.).
2.  **startTime**: The start time of that block in 24-hour HH:MM format.
3.  **subjectName**: The name of the subject or activity in that block (e.g., "Physics 101", "LUNCH", "LIBRARY").

**CRITICAL INSTRUCTIONS:**
-   You MUST extract every block, even if the same subject appears multiple times.
-   You MUST include non-academic blocks like "LUNCH", "BREAK", "LIBRARY", "SPORTS", "NCC", "NSS", etc.
-   Do NOT merge classes.
-   Do NOT calculate end times.
-   You MUST convert all times to 24-hour HH:MM format. For example, "1:30 PM" becomes "13:30".

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
