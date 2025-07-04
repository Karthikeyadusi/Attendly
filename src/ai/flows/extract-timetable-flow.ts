
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
  prompt: `You are an expert AI timetable parser. Your task is to extract class schedule information from an image and return it in a structured JSON format, following very specific rules for class duration and merging.

**CRITICAL LOGIC TO FOLLOW:**

1.  **Recognize and Merge Consecutive Classes:**
    The timetable image may show long classes as two or more consecutive 50-minute blocks under the same subject name. You MUST recognize this pattern. When you see the same subject listed in back-to-back time slots on the same day, you must **merge** them into a single class entry in your output.
    - The \`startTime\` of the merged entry is the start time of the very first block.
    - The \`endTime\` is calculated by adding 100 minutes to that start time.
    - **Example:** The timetable shows 'FLAT' from 9:00-9:50 and 'FLAT' again from 9:50-10:40. You will output ONLY ONE entry for FLAT: \`{ "day": "Mon", "startTime": "09:00", "endTime": "10:40", "subjectName": "FLAT" }\`. You must skip the duplicate entry.

2.  **Universal 100-Minute Duration Rule:**
    Every single class slot in your final JSON output, whether it was merged or appeared as a single entry, MUST have a duration of exactly 100 minutes. Calculate the \`endTime\` by adding 100 minutes to the \`startTime\`.
    - If \`startTime\` is \`09:00\`, \`endTime\` MUST be \`10:40\`.
    - If \`startTime\` is \`10:40\`, \`endTime\` MUST be \`12:20\`.
    - If \`startTime\` is \`13:30\`, \`endTime\` MUST be \`15:10\`.

**IMPORTANT INSTRUCTIONS:**
- **Valid Start Times:** Only extract classes for these start times: 09:00, 10:40, 13:30.
- **Time Formatting:** Convert all times to 24-hour HH:MM format (e.g., "1:30 PM" becomes "13:30").
- **Day Formatting:** Days must be one of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'.
- **Clean Data:** Ignore any text that is not part of the schedule (like room numbers, teacher names, etc.).

Analyze the provided image and produce a clean, merged, and accurate schedule based on these rules.

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
