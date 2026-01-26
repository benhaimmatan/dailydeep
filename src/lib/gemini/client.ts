import { GoogleGenAI } from '@google/genai';
import { reportJsonSchema, ReportSchema, ReportOutput } from './schemas';
import { buildReportPrompt } from './prompts';

/**
 * Create Gemini client instance
 * Requires GEMINI_API_KEY environment variable
 */
export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a report using Gemini with structured output
 * Returns validated report data or throws on error
 *
 * @param topic - The topic to generate a report about
 * @param category - The category name for context
 * @param onProgress - Optional callback for progress updates
 * @returns Validated report output matching ReportSchema
 */
export async function generateReport(
  topic: string,
  category: string,
  onProgress?: (message: string) => Promise<void>
): Promise<ReportOutput> {
  const ai = createGeminiClient();

  await onProgress?.('Starting AI generation...');

  const prompt = buildReportPrompt(topic, category);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: reportJsonSchema,
    },
  });

  await onProgress?.('Validating report structure...');

  // Parse and validate response
  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  const parsed = JSON.parse(text);
  const validated = ReportSchema.parse(parsed);

  // Additional quality checks
  const wordCount = validated.content.split(/\s+/).length;
  if (wordCount < 3000) {
    throw new Error(`Report too short: ${wordCount} words (minimum 3000)`);
  }

  if (validated.sources.length < 5) {
    throw new Error(`Insufficient sources: ${validated.sources.length} (minimum 5)`);
  }

  await onProgress?.('Report validated successfully');

  return validated;
}
