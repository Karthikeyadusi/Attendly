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

Core Task:
Analyze the provided image of a timetable and extract every class slot. For each slot, you must identify:
- subjectName
- day (one of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')
- startTime (in 24-hour HH:MM format)
- endTime (in 24-hour HH:MM format)

**CRITICAL INSTRUCTIONS FOR END TIME CALCULATION:**
To determine the end time for each class, you MUST follow these rules in the exact order they are presented. Do not skip a rule unless its conditions are not met.

**Rule 1: The Special 1:30 PM Lab Slot**
- **Condition:** Does a class start at exactly "13:30"?
- **Action:** If YES, check if any other class on the SAME DAY starts between 13:31 and 15:09.
    - If NO other class starts in that window, set the end time to **"15:10"**.
    - If YES, another class starts in that window, this rule does not apply. Proceed to Rule 2.
- *Example*: A class starts at 13:30 and the next one is at 16:00. The end time is "15:10".
- *Example*: A class starts at 13:30 but another starts at 14:30. Ignore this rule and use Rule 2. The end time will be "14:30".

**Rule 2: The General 'Look Ahead' Rule (For ALL other classes)**
- **Condition:** Does a class have another class scheduled after it on the SAME DAY?
- **Action:** If YES, the end time for the first class is the start time of the next class.
- *This rule applies to all morning classes and any afternoon classes that did not meet the conditions for Rule 1.*
- *Example*: "Physics" at 10:00 is followed by "Math" at 11:00. The end time for "Physics" is "11:00".

**Rule 3: The 'Last Class of the Day' Rule**
- **Condition:** Is this the last class scheduled for the day?
- **Action:** If YES, calculate its end time by adding a standard duration of **50 minutes** to its start time.
- *Example*: The last class is at 14:00. Its end time is "14:50".

**OTHER IMPORTANT RULES:**
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
    const { output } = await prompt(input);
    return output || { slots: [] };
  }
);
