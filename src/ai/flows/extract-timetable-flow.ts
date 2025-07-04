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
Analyze the provided image of a timetable and extract every class slot. For each slot, identify the subject name, day of the week, start time, and end time.

CRITICAL INSTRUCTIONS (Follow these precisely):

1.  **Output Format**: The final output MUST conform strictly to the provided JSON schema. Do not add extra fields.
2.  **Day of the Week**: Days must be one of 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'. Abbreviate days if they are written out (e.g., "Monday" becomes "Mon").
3.  **Time Formatting**: All times MUST be in 24-hour HH:MM format.
    - Convert AM/PM to 24-hour format (e.g., 2 PM is 14:00).
    - Add leading zeros where necessary (e.g., "9:30" becomes "09:30").
4.  **End Time Calculation Logic**: This is the most important rule. Timetables often do not explicitly state an end time.
    - The end time for one class is the start time of the *next class on the same day*.
    - **Example**: If on Tuesday, "Chemistry" is at 10:00 and "Lab" is at 11:00, the end time for "Chemistry" is 11:00.
    - If a class is the **last one for that day**, assume a standard duration of **50 minutes** to calculate its end time. (e.g., a 14:00 class would end at 14:50).
5.  **Data Cleaning**:
    - Ignore any irrelevant text on the image, such as student names, university logos, or page numbers. Focus only on the schedule grid.
    - Ensure that for every slot, the calculated end time is after the start time.

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
