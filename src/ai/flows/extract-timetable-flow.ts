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
Your primary goal is to infer the end time. Follow these rules strictly in this order:

1.  **Special Afternoon Slot**: First, check for this specific case. If a class starts at "13:30" (1:30 PM), its end time MUST be "15:10" (3:10 PM), UNLESS there is another class on the same day that starts between 13:31 and 15:09. If such a class exists, this rule does not apply, and you should proceed to Rule 2.
    - *Example 1*: "Chemistry Lab" starts at 13:30 on Tuesday, and the next class isn't until 16:00. The end time for "Chemistry Lab" is "15:10".
    - *Example 2*: "Chemistry Lab" starts at 13:30 on Tuesday, but a "Tutorial" starts at 14:30. This rule is skipped. The end time for the lab will be "14:30" based on Rule 2.

2.  **Look Ahead (General Rule):** If the special case above does not apply, the end time for a class is ALWAYS the start time of the next class that occurs on the SAME DAY.
    - *Example*: If "Physics" is at 10:00 on Monday and "Math" is at 11:00 on Monday, the end time for "Physics" is "11:00".

3.  **Default Duration for Last Class:** If a class is the final one scheduled for a particular day and the above rules do not apply, you MUST calculate its end time by assuming a standard duration of **50 minutes**.
    - *Example*: If "History" is at 14:00 on Wednesday and it's the last class, its end time will be "14:50".

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
