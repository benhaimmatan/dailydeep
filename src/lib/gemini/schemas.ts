import { z } from 'zod';

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
 * Flat JSON Schema for Gemini structured output
 * Gemini doesn't support $ref or definitions, so we define it manually
 */
export const reportJsonSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Compelling headline for the report, 10-100 characters',
    },
    subtitle: {
      type: 'string',
      description: 'Supporting subheadline providing context, 20-200 characters',
    },
    summary: {
      type: 'string',
      description: 'Executive summary in 2-3 sentences, 100-500 characters',
    },
    content: {
      type: 'string',
      description: 'Full markdown report content. Must be 3000+ words with headers, tables, data points, and analysis.',
    },
    sources: {
      type: 'array',
      description: 'At least 5 credible sources with URLs',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the source publication or organization',
          },
          url: {
            type: 'string',
            description: 'URL to the source',
          },
        },
        required: ['name', 'url'],
      },
    },
    seo_title: {
      type: 'string',
      description: 'SEO-optimized title, max 60 characters',
    },
    seo_description: {
      type: 'string',
      description: 'SEO meta description, max 160 characters',
    },
    seo_keywords: {
      type: 'array',
      description: '5-10 relevant SEO keywords',
      items: {
        type: 'string',
      },
    },
  },
  required: ['title', 'subtitle', 'summary', 'content', 'sources', 'seo_title', 'seo_description', 'seo_keywords'],
};
