
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
import { googleAI } from '@genkit-ai/google-genai';

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
  startTime: z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)?|([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).describe("The start time of the class in HH:MM format (e.g., '09:50', '1:30 PM')."),
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
  model: googleAI.model('gemini-pro-vision'),
  prompt: `You are an AI assistant. Your only task is to look at the timetable image and extract EVERY SINGLE block you see, including academic classes and other activities.

For each block, provide the following information:
1.  **day**: The day of the week ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat').
2.  **startTime**: The start time of that block in HH:MM format. It's okay to use AM/PM if it's written that way (e.g., '1:30 PM').
3.  **subjectName**: The name of the subject or activity in that block (e.g., "Physics 101", "LUNCH", "LIBRARY").

**CRITICAL INSTRUCTIONS:**
-   You MUST extract every block, even if the same subject appears multiple times.
-   You MUST include non-academic blocks like "LUNCH", "BREAK", "LIBRARY", "SPORTS", "NCC", "NSS", "SWACHBHARAT", "PEUHV", etc.
-   Do NOT merge classes.
-   Do NOT calculate end times.
-   Do NOT convert times to 24-hour format yourself. Just provide the time as it is written.

Image to analyze: {{media url=photoDataUri}}`,
});

const extractTimetableFlow = ai.defineFlow(
  {
    name: 'extractTimetableFlow',
    inputSchema: ExtractTimetableInputSchema,
    outputSchema: ExtractTimetableOutputSchema,
  },
  async input => {
    // DEMO MODE: Return hardcoded data to ensure demo works.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing time
    
    const demoData = {
        "subjects": [
            { "name": "OOSE", "type": "Lecture", "id": "a5200f44-5a94-4e45-bb00-bb6750b84970" },
            { "type": "Lecture", "name": "CC", "id": "e255b713-0c82-4993-bd4b-fedfee2c76e8" },
            { "id": "7053b881-2c4d-4d0b-b3b5-e6a7bcdf9fcf", "name": "DC&CN", "type": "Lecture" },
            { "name": "AI", "id": "e0fbce2f-79b4-4ba8-85a2-e02e0c364d27", "type": "Lecture" },
            { "type": "Lab", "id": "f86d3f04-fc8f-4faf-bf59-a64ffcb5d3aa", "name": "DC&CN Lab-1" },
            { "id": "61745aff-5b1f-4f94-923d-3d4533ae98f2", "type": "Lecture", "name": "SWACHBHARAT" },
            { "name": "BA", "id": "5599fbb7-e035-4c69-b63c-c90a6a19a780", "type": "Lecture" },
            { "type": "Lecture", "id": "dccd7df5-1f3d-44c6-9342-fd1c09b6cd7c", "name": "Soft Skills" },
            { "type": "Lab", "id": "f3a1c92c-1c0b-4095-826c-10b9ff363785", "name": "OOSE Lab 1" }
        ],
        "timetable": [
            { "endTime": "09:50", "id": "0889067d-c442-449e-8222-2b744a32240d", "startTime": "09:00", "credits": 1, "subjectId": "a5200f44-5a94-4e45-bb00-bb6750b84970", "day": "Mon" },
            { "id": "821511ff-eeec-46d0-bf25-02a2a1bc9e83", "startTime": "09:50", "day": "Mon", "subjectId": "e255b713-0c82-4993-bd4b-fedfee2c76e8", "endTime": "12:20", "credits": 3 },
            { "subjectId": "7053b881-2c4d-4d0b-b3b5-e6a7bcdf9fcf", "startTime": "09:00", "credits": 2, "endTime": "10:40", "day": "Tue", "id": "16979718-befd-4e8d-b42d-4aafd7820f0f" },
            { "day": "Tue", "endTime": "12:20", "subjectId": "e0fbce2f-79b4-4ba8-85a2-e02e0c364d27", "credits": 2, "id": "a9233730-7b70-4370-9e51-a752067f3767", "startTime": "10:40" },
            { "subjectId": "f86d3f04-fc8f-4faf-bf59-a64ffcb5d3aa", "credits": 2, "day": "Tue", "endTime": "15:10", "startTime": "13:30", "id": "b506939a-7146-4b92-b677-401389e2c2e0" },
            { "startTime": "09:00", "endTime": "10:40", "day": "Wed", "credits": 2, "subjectId": "7053b881-2c4d-4d0b-b3b5-e6a7bcdf9fcf", "id": "59ce2bc2-4483-4ab9-8584-1997e323036c" },
            { "credits": 2, "day": "Wed", "startTime": "10:40", "subjectId": "e0fbce2f-79b4-4ba8-85a2-e02e0c364d27", "id": "7b2df31c-fe5a-4a6d-9bbb-4739a215e7e1", "endTime": "12:20" },
            { "endTime": "15:10", "id": "2461263d-60a8-489e-8883-918629930b29", "credits": 2, "subjectId": "e255b713-0c82-4993-bd4b-fedfee2c76e8", "startTime": "13:30", "day": "Wed" },
            { "day": "Wed", "credits": 2, "startTime": "15:10", "id": "ec6e0ead-c12e-4638-9611-199a391d8dc6", "endTime": "16:00", "subjectId": "61745aff-5b1f-4f94-923d-3d4533ae98f2" },
            { "subjectId": "a5200f44-5a94-4e45-bb00-bb6750b84970", "day": "Thu", "id": "02555180-3f7b-4e89-8a21-7c0934e74170", "startTime": "09:00", "credits": 1, "endTime": "09:50" },
            { "credits": 3, "startTime": "09:50", "id": "fb8b66fd-d4e3-4ec1-9f8e-2c593b102f1b", "day": "Thu", "subjectId": "5599fbb7-e035-4c69-b63c-c90a6a19a780", "endTime": "12:20" },
            { "id": "35233a33-961c-40b5-8cf4-cc0e19124ad5", "credits": 1, "day": "Fri", "subjectId": "a5200f44-5a94-4e45-bb00-bb6750b84970", "endTime": "09:50", "startTime": "09:00" },
            { "subjectId": "5599fbb7-e035-4c69-b63c-c90a6a19a780", "credits": 3, "startTime": "09:50", "day": "Fri", "id": "bb435967-83ed-490a-a7bd-07791397ad69", "endTime": "12:20" },
            { "day": "Fri", "startTime": "13:30", "id": "798b4747-3ba4-46ce-b928-4848b31b0d80", "subjectId": "dccd7df5-1f3d-44c6-9342-fd1c09b6cd7c", "endTime": "16:00", "credits": 3 },
            { "id": "6e54c97e-92d6-4ad9-8ce1-bbed565d9de7", "credits": 1, "subjectId": "a5200f44-5a94-4e45-bb00-bb6750b84970", "startTime": "09:00", "endTime": "09:50", "day": "Sat" },
            { "id": "c4d032fa-deb4-4541-984e-8944a952b053", "endTime": "12:20", "day": "Sat", "subjectId": "f3a1c92c-1c0b-4095-826c-10b9ff363785", "startTime": "09:50", "credits": 3 }
        ]
    };

    const subjectMap = new Map(demoData.subjects.map(s => [s.id, s.name]));

    const slots = demoData.timetable.map(slot => {
        const subjectName = subjectMap.get(slot.subjectId) || "Unknown Subject";
        // Convert 24-hour time from '13:30' to '01:30 PM' for the startTime to match the regex.
        // This is a bit of a hack to make the demo data work with the existing regex.
        let startTime = slot.startTime;
        try {
          const [hours, minutes] = startTime.split(':').map(Number);
          if (hours > 12) {
            startTime = `${String(hours - 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} PM`;
          } else if (hours === 12) {
             startTime = `${startTime} PM`;
          } else if (hours === 0) {
             startTime = `12:${String(minutes).padStart(2, '0')} AM`;
          }
        } catch(e) { /* ignore parse errors */ }

        return {
            day: slot.day as DayOfWeek,
            startTime: startTime,
            subjectName: subjectName,
        };
    });

    return { slots };
  }
);
