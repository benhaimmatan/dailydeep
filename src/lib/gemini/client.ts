import { GoogleGenAI } from '@google/genai';
import { reportJsonSchema, ReportSchema, ReportOutput } from './schemas';
import { buildReportPrompt } from './prompts';
import { validateMermaidCharts, formatValidationErrors } from './mermaid-validator';

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
 * Retry configuration for network errors
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000, // 2 seconds
  maxDelayMs: 30000, // 30 seconds max
  backoffMultiplier: 2,
  retryableCodes: [503, 429, 500, 502, 504], // Overloaded, rate limited, server errors
};

/**
 * Retry configuration for content quality issues (e.g., too short, invalid charts)
 */
const CONTENT_RETRY_CONFIG = {
  maxRetries: 2, // Up to 2 content retries
  minWordCount: 1800, // Target is 2000-2500, allow some flexibility
};

/**
 * Context for content retries (tracks what went wrong)
 */
interface ContentRetryContext {
  attempt: number;
  previousWordCount?: number;
  chartErrors?: string[];
}

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

  // Outer loop for content quality retries (e.g., too short, invalid charts)
  let contentRetryAttempt = 0;
  let retryContext: ContentRetryContext | undefined;

  while (contentRetryAttempt <= CONTENT_RETRY_CONFIG.maxRetries) {
    // Build prompt with retry context if this is a content retry
    const prompt = buildReportPrompt(topic, category, retryContext);

    let lastError: Error | null = null;
    let delay = RETRY_CONFIG.initialDelayMs;

    // Inner loop for network error retries
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries + 1; attempt++) {
      try {
        const contentRetryLabel = contentRetryAttempt > 0 ? ` [content retry ${contentRetryAttempt}/${CONTENT_RETRY_CONFIG.maxRetries}]` : '';
        const attemptLabel = attempt === 1 ? '' : ` (network attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1})`;
        await onProgress?.(`Starting AI generation...${contentRetryLabel}${attemptLabel}`);

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
        const charCount = validated.content.length;

        // Check if content is too short - retry if we have attempts left
        if (wordCount < CONTENT_RETRY_CONFIG.minWordCount) {
          if (contentRetryAttempt < CONTENT_RETRY_CONFIG.maxRetries) {
            contentRetryAttempt++;
            retryContext = { attempt: contentRetryAttempt, previousWordCount: wordCount };
            await onProgress?.(`Content too short: ${wordCount} words / ${charCount} chars (need ${CONTENT_RETRY_CONFIG.minWordCount}+ words). Regenerating... [retry ${contentRetryAttempt}/${CONTENT_RETRY_CONFIG.maxRetries}]`);
            break; // Break inner loop to retry with new prompt
          }
          // No more content retries - throw error
          throw new GenerationError(
            `Report too short: ${wordCount} words (minimum ${CONTENT_RETRY_CONFIG.minWordCount}) after ${contentRetryAttempt} content retries`,
            rawResponse,
            fieldLengths
          );
        }

        // Validate Mermaid charts
        const mermaidValidation = validateMermaidCharts(validated.content);
        if (mermaidValidation.warnings.length > 0) {
          await onProgress?.(`Chart warnings: ${mermaidValidation.warnings.join('; ')}`);
        }

        if (!mermaidValidation.isValid) {
          if (contentRetryAttempt < CONTENT_RETRY_CONFIG.maxRetries) {
            contentRetryAttempt++;
            retryContext = {
              attempt: contentRetryAttempt,
              previousWordCount: wordCount,
              chartErrors: mermaidValidation.errors,
            };
            await onProgress?.(`Chart validation failed: ${formatValidationErrors(mermaidValidation)}. Regenerating... [retry ${contentRetryAttempt}/${CONTENT_RETRY_CONFIG.maxRetries}]`);
            break; // Break inner loop to retry with new prompt
          }
          // No more content retries - throw error
          throw new GenerationError(
            `Chart validation failed after ${contentRetryAttempt} retries: ${mermaidValidation.errors.join('; ')}`,
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

        await onProgress?.(`Report validated successfully (${wordCount} words, ${charCount} chars)`);

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

    // If we reach here without returning, it means we broke out of the inner loop for a content retry
    // Continue to next iteration of outer loop
    if (contentRetryAttempt > CONTENT_RETRY_CONFIG.maxRetries) {
      break;
    }
  }

  // Should never reach here, but just in case
  throw new Error('Generation failed after all retries');
}
