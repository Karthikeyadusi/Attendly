
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
  prompt: `You are an expert AI specializing in parsing visual timetables for college students. Your goal is to accurately extract class schedule information from an image and return it in a structured JSON format.

Analyze the provided image and extract every class slot. For each slot, you must identify:
- subjectName
- day (one of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')
- startTime (in 24-hour HH:MM format)
- endTime (in 24-hour HH:MM format)

**CRITICAL RULES FOR DETERMINING THE END TIME:**
You must determine the 'endTime' by following these rules precisely.

**RULE 1: CALCULATE A PROVISIONAL END TIME**
For every class, calculate a provisional \`endTime\` by adding exactly **100 minutes** to its \`startTime\`.

**RULE 2: PREVENT OVERLAPS (FINAL CHECK)**
After you have the provisional \`endTime\` from Rule 1, you must perform this final check:
- Look ahead to the next class on the **SAME DAY**.
- If the \`startTime\` of the next class is EARLIER than your provisional \`endTime\`, you MUST use the start time of that next class as the FINAL \`endTime\`.
- If there is no next class on the same day, or if the next class starts after your provisional end time, then your provisional end time is correct and becomes the FINAL \`endTime\`.

This two-step process is crucial. First calculate a 100-minute duration, then adjust it only if needed to avoid an overlap.

**OTHER IMPORTANT INSTRUCTIONS:**
- **Time Formatting:** All times must be in 24-hour HH:MM format (e.g., "9:30 AM" becomes "09:30", "2 PM" becomes "14:00").
- **Day Formatting**: Days must be abbreviated to 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'.
- **Data Cleaning**: Ignore all non-schedule text like names, room numbers, or university logos.
- **Strict Schema:** The final output must perfectly match the provided JSON schema.

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
