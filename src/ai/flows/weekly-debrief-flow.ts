
'use server';
/**
 * @fileOverview An AI flow to generate a weekly attendance summary.
 *
 * - generateWeeklyDebrief - A function that handles creating the debrief.
 * - WeeklyDebriefInput - The input type for the debrief function.
 * - WeeklyDebriefOutput - The return type for the debrief function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassInfoSchema = z.object({
  subjectName: z.string(),
  day: z.string(),
});

const WeeklyDebriefInputSchema = z.object({
  userName: z.string().optional().describe('The name of the user for personalization.'),
  weekStartDate: z.string().describe('The start date of the week in YYYY-MM-DD format.'),
  weekEndDate: z.string().describe('The end date of the week in YYYY-MM-DD format.'),
  attendedClasses: z.array(ClassInfoSchema).describe('List of classes the user attended this week.'),
  missedClasses: z.array(ClassInfoSchema).describe('List of classes the user missed this week.'),
  cancelledClasses: z.array(ClassInfoSchema).describe('List of classes that were cancelled this week.'),
});
export type WeeklyDebriefInput = z.infer<typeof WeeklyDebriefInputSchema>;

const WeeklyDebriefOutputSchema = z.object({
  headline: z.string().describe("A short, catchy headline for the weekly summary (e.g., 'Great week!', 'Perfect Attendance!', 'Let's bounce back!')."),
  summary: z.string().describe("A friendly, motivational summary of the user's weekly attendance. It should be 2-3 sentences long. Mention specific achievements or areas for improvement."),
  attendancePercentage: z.number().describe("The user's attendance percentage for the week (attended / (attended + missed))."),
});
export type WeeklyDebriefOutput = z.infer<typeof WeeklyDebriefOutputSchema>;

export async function generateWeeklyDebrief(input: WeeklyDebriefInput): Promise<WeeklyDebriefOutput> {
  const totalConducted = input.attendedClasses.length + input.missedClasses.length;
  const attendancePercentage = totalConducted > 0 ? (input.attendedClasses.length / totalConducted) * 100 : 100;
  
  // Return a mocked response instead of calling the AI
  return {
    headline: "Solid Week!",
    summary: "You're doing great. Keep up the consistent effort and you'll finish the semester strong. Let's aim to catch that one class next week!",
    attendancePercentage: parseFloat(attendancePercentage.toFixed(1)),
  };

  /*
  const aiInput = {
    ...input,
    attendancePercentage: parseFloat(attendancePercentage.toFixed(1)),
  };

  const { output } = await weeklyDebriefPrompt(aiInput);
  
  // Ensure the output from the AI has the correct percentage we calculated.
  return { ...output!, attendancePercentage };
  */
}

/*
const weeklyDebriefPrompt = ai.definePrompt({
  name: 'weeklyDebriefPrompt',
  input: { schema: WeeklyDebriefInputSchema.extend({ attendancePercentage: z.number() }) },
  output: { schema: WeeklyDebriefOutputSchema },
  prompt: `You are an AI assistant in an attendance tracking app called Attendly. Your task is to generate a personalized weekly summary.
You will act as a friendly and motivational coach.

{{#if userName}}The user's name is {{userName}}. Address them directly.{{/if}}
The week is from {{weekStartDate}} to {{weekEndDate}}.
The user's attendance percentage for the week was {{attendancePercentage}}%.

Here is the data for the week:
Attended Classes:
{{#each attendedClasses}}
- {{subjectName}} on {{day}}
{{/each}}

Missed Classes:
{{#each missedClasses}}
- {{subjectName}} on {{day}}
{{/each}}

Cancelled Classes:
{{#each cancelledClasses}}
- {{subjectName}} on {{day}}
{{/each}}

Based on this data, generate a response in the specified JSON format.

**Instructions for your response:**
1.  **headline**: Create a short, encouraging headline. If attendance is 100%, say "Perfect Week!". If it's high (>= 90%), say something like "Awesome Work!". If it's good (>= 75%), use "Solid Week!". If it's lower, use something encouraging like "Let's Bounce Back!".
2.  **summary**: Write a 2-3 sentence summary.
    - If attendance is high, congratulate them. Point out a positive trend, like "You were perfect in all your labs" or "You didn't miss a single Physics class."
    - If attendance is low, be encouraging, not critical. Suggest a small goal, like "Let's aim to catch that Math class next week."
    - Acknowledge the hard work regardless of the percentage.
3.  **attendancePercentage**: You MUST return the exact percentage value provided in the input: {{attendancePercentage}}. Do not recalculate it.
`,
});
*/
