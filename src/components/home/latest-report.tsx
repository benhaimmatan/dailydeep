import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { ReportWithCategory } from '@/types/database'

interface LatestReportProps {
  report: ReportWithCategory
  readingTime: number
}

/**
 * Featured display of the latest published report
 * Large title, metadata, summary excerpt, and CTA button
 */
export function LatestReport({ report, readingTime }: LatestReportProps) {
  const categoryName = report.category?.name ?? 'Uncategorized'

  // Format date as "January 25, 2026"
  const formattedDate = new Date(
    report.published_at || report.created_at
  ).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Get excerpt from summary or content (first ~200 chars)
  const excerpt = report.summary
    ? report.summary.slice(0, 200) + (report.summary.length > 200 ? '...' : '')
    : report.content.slice(0, 200).trim() + '...'

  return (
    <div className="min-h-[70vh] flex flex-col justify-center max-w-3xl mx-auto px-4">
      {/* Meta line */}
      <div className="flex items-center gap-4 mb-6">
        <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/30">
          {categoryName}
        </Badge>
        <time
          dateTime={report.published_at || report.created_at}
          className="text-muted-foreground text-sm"
        >
          {formattedDate}
        </time>
        <span className="text-muted-foreground text-sm">
          {readingTime} min read
        </span>
      </div>

      {/* Title */}
      <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
        {report.title}
      </h1>

      {/* Subtitle if present */}
      {report.subtitle && (
        <p className="text-xl md:text-2xl text-muted-foreground mb-6">
          {report.subtitle}
        </p>
      )}

      {/* Excerpt */}
      <p className="text-muted-foreground text-lg leading-relaxed mb-8">
        {excerpt}
      </p>

      {/* CTA Button */}
      <div>
        <Link
          href={`/report/${report.slug}`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Read Report
          <span aria-hidden="true">&larr;</span>
        </Link>
      </div>

      {/* Archive Link */}
      <div className="mt-4">
        <Link
          href="/archive"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          View All Reports &larr;
        </Link>
      </div>
    </div>
  )
}
