
'use server';
/**
 * @fileOverview An AI flow to extract questions from a question paper.
 *
 * - extractQuestions - A function that handles parsing a question paper image/PDF.
 * - ExtractQuestionsInput - The input type for the extractQuestions function.
 * - ExtractQuestionsOutput - The return type for the extractQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractQuestionsInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "An image or PDF of a question paper, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractQuestionsInput = z.infer<typeof ExtractQuestionsInputSchema>;

const QuestionSchema = z.object({
  questionNumber: z.string().describe("The number of the question (e.g., '1a', '2', 'III.b')."),
  questionText: z.string().describe("The full text of the question."),
  marks: z.number().describe("The marks allocated for the question (e.g., 2, 5, 10)."),
});

const ExtractQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type ExtractQuestionsOutput = z.infer<typeof ExtractQuestionsOutputSchema>;

export async function extractQuestions(input: ExtractQuestionsInput): Promise<ExtractQuestionsOutput> {
  return extractQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractQuestionsPrompt',
  input: {schema: ExtractQuestionsInputSchema},
  output: {schema: ExtractQuestionsOutputSchema},
  prompt: `You are an expert AI assistant tasked with parsing academic question papers. Your job is to meticulously analyze the provided document (image or PDF) and extract every single question.

For each question you identify, you must extract the following information:
1.  **questionNumber**: The exact number or identifier for the question (e.g., "1", "2a", "IV.c").
2.  **questionText**: The complete and unabridged text of the question itself.
3.  **marks**: The numerical value of the marks assigned to the question. Look for indicators like "(2m)", "[5 marks]", or "10M". You must return this as a number.

**CRITICAL INSTRUCTIONS:**
-   Extract ALL questions, including all sub-parts (like a, b, c).
-   Be precise. Do not paraphrase or shorten the question text.
-   If a question has multiple parts, treat each part as a separate question entry with its own number (e.g., '3a', '3b').
-   The 'marks' value must be a number, not a string like '5m'.

Analyze the following document: {{media url=documentDataUri}}`,
});

const extractQuestionsFlow = ai.defineFlow(
  {
    name: 'extractQuestionsFlow',
    inputSchema: ExtractQuestionsInputSchema,
    outputSchema: ExtractQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
