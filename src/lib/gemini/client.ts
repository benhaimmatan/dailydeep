import { GoogleGenAI } from '@google/genai';
import { reportJsonSchema, ReportSchema, ReportOutput } from './schemas';
import { buildReportPrompt } from './prompts';

/**
 * Custom error class that preserves raw response for debugging
 */
export class GenerationError extends Error {
  rawResponse?: string;
  fieldLengths?: Record<string, number>;

  constructor(message: string, rawResponse?: string, fieldLengths?: Record<string, number>) {
    super(message);
    this.name = 'GenerationError';
    this.rawResponse = rawResponse;
    this.fieldLengths = fieldLengths;
  }
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000, // 2 seconds
  maxDelayMs: 30000, // 30 seconds max
  backoffMultiplier: 2,
  retryableCodes: [503, 429, 500, 502, 504], // Overloaded, rate limited, server errors
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): { retryable: boolean; code?: number; message?: string } {
  if (error instanceof Error) {
    const message = error.message;

    // Check for HTTP status codes in error message
    for (const code of RETRY_CONFIG.retryableCodes) {
      if (message.includes(`${code}`) || message.includes(`"code":${code}`)) {
        return { retryable: true, code, message };
      }
    }

    // Check for common retryable error messages
    if (
      message.includes('overloaded') ||
      message.includes('UNAVAILABLE') ||
      message.includes('rate limit') ||
      message.includes('quota') ||
      message.includes('timeout') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT')
    ) {
      return { retryable: true, message };
    }
  }

  return { retryable: false };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format milliseconds as human-readable string
 */
function formatWaitTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

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
 * Includes automatic retry with exponential backoff for transient errors
 *
 * @param topic - The topic to generate a report about
 * @param category - The category name for context
 * @param onProgress - Optional callback for progress updates
 * @returns Validated report output matching ReportSchema
 */
export interface GenerateReportResult {
  report: ReportOutput;
  rawResponse: string;
}

export async function generateReport(
  topic: string,
  category: string,
  onProgress?: (message: string) => Promise<void>
): Promise<GenerateReportResult> {
  const ai = createGeminiClient();
  const prompt = buildReportPrompt(topic, category);

  let lastError: Error | null = null;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries + 1; attempt++) {
    try {
      const attemptLabel = attempt === 1 ? '' : ` (attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1})`;
      await onProgress?.(`Starting AI generation...${attemptLabel}`);

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

      // Store raw response for debugging
      const rawResponse = text;

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        // If JSON parsing fails, include the raw text in the error
        throw new GenerationError(`Invalid JSON from Gemini. Raw response (first 1000 chars): ${text.slice(0, 1000)}`, text);
      }

      // Capture field lengths for debugging
      const fieldLengths = {
        title: parsed.title?.length || 0,
        subtitle: parsed.subtitle?.length || 0,
        summary: parsed.summary?.length || 0,
        content: parsed.content?.length || 0,
        seo_title: parsed.seo_title?.length || 0,
        seo_description: parsed.seo_description?.length || 0,
        sources: parsed.sources?.length || 0,
      };

      await onProgress?.(`Raw response received. Lengths: title=${fieldLengths.title}, subtitle=${fieldLengths.subtitle}, summary=${fieldLengths.summary}, content=${fieldLengths.content}, seo_title=${fieldLengths.seo_title}, seo_desc=${fieldLengths.seo_description}, sources=${fieldLengths.sources}`);

      // Truncate fields that Gemini may have exceeded limits on
      // Gemini doesn't enforce character limits from JSON schema
      if (parsed.summary && parsed.summary.length > 500) {
        parsed.summary = parsed.summary.slice(0, 497) + '...';
      }
      if (parsed.seo_title && parsed.seo_title.length > 60) {
        parsed.seo_title = parsed.seo_title.slice(0, 57) + '...';
      }
      if (parsed.seo_description && parsed.seo_description.length > 160) {
        parsed.seo_description = parsed.seo_description.slice(0, 157) + '...';
      }
      if (parsed.subtitle && parsed.subtitle.length > 200) {
        parsed.subtitle = parsed.subtitle.slice(0, 197) + '...';
      }
      if (parsed.title && parsed.title.length > 100) {
        parsed.title = parsed.title.slice(0, 97) + '...';
      }

      let validated;
      try {
        validated = ReportSchema.parse(parsed);
      } catch (zodError) {
        // Validation failed - throw with raw response preserved
        throw new GenerationError(
          `Validation failed: ${zodError instanceof Error ? zodError.message : String(zodError)}`,
          rawResponse,
          fieldLengths
        );
      }

      // Additional quality checks
      const wordCount = validated.content.split(/\s+/).length;
      if (wordCount < 3000) {
        throw new GenerationError(
          `Report too short: ${wordCount} words (minimum 3000)`,
          rawResponse,
          fieldLengths
        );
      }

      if (validated.sources.length < 5) {
        throw new GenerationError(
          `Insufficient sources: ${validated.sources.length} (minimum 5)`,
          rawResponse,
          fieldLengths
        );
      }

      await onProgress?.('Report validated successfully');

      return { report: validated, rawResponse };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const { retryable, code } = isRetryableError(error);

      // If not retryable or last attempt, throw
      if (!retryable || attempt > RETRY_CONFIG.maxRetries) {
        const errorContext = code ? ` (HTTP ${code})` : '';
        throw new Error(`Generation failed${errorContext}: ${lastError.message}`);
      }

      // Log retry attempt
      const waitTime = formatWaitTime(delay);
      const retryMessage = code === 503
        ? `Gemini is temporarily overloaded. Retrying in ${waitTime}... (attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1})`
        : code === 429
        ? `Rate limited by Gemini. Retrying in ${waitTime}... (attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1})`
        : `Temporary error. Retrying in ${waitTime}... (attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1})`;

      await onProgress?.(retryMessage);

      // Wait before retry
      await sleep(delay);

      // Exponential backoff with cap
      delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error('Generation failed after all retries');
}
