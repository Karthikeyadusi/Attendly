
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

**CRITICAL RULES FOR DETERMINING END TIME:**
You must determine the endTime for each class by following these rules IN ORDER.

**RULE A: General Look-Ahead Rule**
For any given class, look for the next class scheduled on the SAME DAY.
- **If** there is a next class, the \`endTime\` of the current class is the \`startTime\` of that next class.
- **Example:** "Physics" starts at 10:00. The next class, "Math", starts at 11:00 on the same day. The \`endTime\` for "Physics" is "11:00".

**RULE B: Last Class of the Day Rule**
- **If** a class is the LAST one for that day (meaning Rule A did not find a 'next class'), you must determine its \`endTime\` based on its \`startTime\`:
    - **If** the \`startTime\` is "12:00" or later (i.e., it's an afternoon class), set its \`endTime\` to "15:10".
    - **For any other \`startTime\` (i.e., it's a morning class)**, set the \`endTime\` by adding 50 minutes.
    - **Example 1 (Afternoon):** A class starts at 13:30 and is the last class. Its \`endTime\` is "15:10".
    - **Example 2 (Morning):** A class starts at 11:00 and is the last class. Its \`endTime\` is "11:50".

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
    const { output } = await prompt(input);
    return output || { slots: [] };
  }
);
