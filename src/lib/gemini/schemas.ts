import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Source citation schema
 */
export const SourceSchema = z.object({
  name: z.string().describe('Name of the source publication or organization'),
  url: z.string().url().describe('URL to the source'),
});

/**
 * Full report schema matching database structure
 * Used for Gemini structured output validation
 */
export const ReportSchema = z.object({
  title: z.string()
    .min(10)
    .max(100)
    .describe('Compelling headline for the report, 10-100 characters'),

  subtitle: z.string()
    .min(20)
    .max(200)
    .describe('Supporting subheadline providing context, 20-200 characters'),

  summary: z.string()
    .min(100)
    .max(500)
    .describe('Executive summary in 2-3 sentences, 100-500 characters'),

  content: z.string()
    .min(15000) // ~3000 words minimum
    .describe('Full markdown report content. Must be 3000+ words with headers, tables, data points, and analysis.'),

  sources: z.array(SourceSchema)
    .min(5)
    .describe('At least 5 credible sources with URLs'),

  seo_title: z.string()
    .max(60)
    .describe('SEO-optimized title, max 60 characters'),

  seo_description: z.string()
    .max(160)
    .describe('SEO meta description, max 160 characters'),

  seo_keywords: z.array(z.string())
    .min(5)
    .max(10)
    .describe('5-10 relevant SEO keywords'),
});

export type ReportOutput = z.infer<typeof ReportSchema>;

/**
 * JSON Schema for Gemini structured output
 * Type assertion needed due to zod v4 compatibility with zod-to-json-schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reportJsonSchema = zodToJsonSchema(ReportSchema as any, 'ReportSchema');
