import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ReportHeader } from '@/components/report/report-header'
import { ReportContent } from '@/components/report/report-content'
import { ReportTOC } from '@/components/report/report-toc'
import { ReportSources } from '@/components/report/report-sources'
import { extractHeadings } from '@/lib/utils/extract-headings'
import { calculateReadingTime } from '@/lib/utils/reading-time'
import type { ReportWithCategory } from '@/types/database'
import { generateArticleJsonLd, safeJsonLdStringify } from '@/lib/seo/json-ld'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Fetch report by slug with category join
 */
async function getReport(slug: string): Promise<ReportWithCategory | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      *,
      category:categories(*)
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) {
    return null
  }

  return data as ReportWithCategory
}

/**
 * Generate dynamic metadata for SEO
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const report = await getReport(slug)

  if (!report) {
    return {
      title: 'Report Not Found',
    }
  }

  const title = report.seo_title || report.title
  const description =
    report.seo_description ||
    report.summary ||
    report.content.slice(0, 160).trim() + '...'

  return {
    title,
    description,
    keywords: report.seo_keywords || undefined,
    openGraph: {
      type: 'article',
      title,
      description,
      publishedTime: report.published_at || undefined,
      modifiedTime: report.updated_at,
      authors: ['The Daily Deep'],
      section: report.category?.name || 'News',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

/**
 * Report detail page with two-column layout
 */
export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params
  const report = await getReport(slug)

  if (!report) {
    notFound()
  }

  // Extract headings for TOC
  const headings = extractHeadings(report.content)

  // Use stored reading time or calculate from content
  const readingTime = report.reading_time ?? calculateReadingTime(report.content)

  // Get category name with fallback
  const categoryName = report.category?.name ?? 'Uncategorized'

  // Generate JSON-LD structured data for SEO
  const jsonLd = generateArticleJsonLd(report)

  return (
    <article className="max-w-6xl mx-auto px-4 py-8">
      {/* JSON-LD structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(jsonLd),
        }}
      />
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
        {/* Main content */}
        <main>
          <ReportHeader
            title={report.title}
            subtitle={report.subtitle}
            category={categoryName}
            publishedAt={report.published_at || report.created_at}
            readingTime={readingTime}
          />

          <ReportContent content={report.content} />

          {report.sources && report.sources.length > 0 && (
            <ReportSources sources={report.sources} />
          )}
        </main>

        {/* Sidebar with TOC */}
        <aside className="hidden lg:block">
          <ReportTOC headings={headings} />
        </aside>
      </div>
    </article>
  )
}
