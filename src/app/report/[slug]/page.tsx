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

  return {
    title: report.seo_title || report.title,
    description:
      report.seo_description ||
      report.summary ||
      report.content.slice(0, 160).trim() + '...',
    keywords: report.seo_keywords || undefined,
    openGraph: {
      title: report.seo_title || report.title,
      description:
        report.seo_description ||
        report.summary ||
        report.content.slice(0, 160).trim() + '...',
      type: 'article',
      publishedTime: report.published_at || undefined,
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

  return (
    <article className="max-w-6xl mx-auto px-4 py-8">
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
