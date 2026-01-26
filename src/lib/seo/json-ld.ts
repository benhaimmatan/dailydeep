import type { Article, WithContext } from 'schema-dts'
import type { ReportWithCategory } from '@/types/database'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thedailydeep.com'

/**
 * Generate Article JSON-LD structured data for a report
 * Used for Google rich search results
 */
export function generateArticleJsonLd(report: ReportWithCategory): WithContext<Article> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: report.title,
    description: report.seo_description || report.summary || undefined,
    image: `${SITE_URL}/report/${report.slug}/opengraph-image`,
    datePublished: report.published_at || report.created_at,
    dateModified: report.updated_at,
    author: {
      '@type': 'Organization',
      name: 'The Daily Deep',
      description: 'AI-assisted investigative journalism',
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Daily Deep',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    wordCount: report.word_count || undefined,
    keywords: report.seo_keywords?.join(', ') || undefined,
    articleSection: report.category?.name || 'News',
    inLanguage: 'en-US',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/report/${report.slug}`,
    },
  }
}

/**
 * Safely stringify JSON-LD for inline script tag
 * Escapes < characters to prevent XSS
 */
export function safeJsonLdStringify(jsonLd: object): string {
  return JSON.stringify(jsonLd).replace(/</g, '\\u003c')
}
