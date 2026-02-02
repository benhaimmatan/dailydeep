import { formatDate } from '@/lib/utils/format-date'

interface ReportHeaderProps {
  title: string
  subtitle?: string | null
  category: string
  publishedAt: string
  readingTime: number
}

/**
 * Report header with title, metadata, and category badge
 */
export function ReportHeader({
  title,
  subtitle,
  category,
  publishedAt,
  readingTime,
}: ReportHeaderProps) {
  return (
    <header className="mb-10">
      {/* Category badge */}
      <div className="mb-4">
        <span className="inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
          {category}
        </span>
      </div>

      {/* Title */}
      <h1 className="font-playfair text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
        {title}
      </h1>

      {/* Subtitle with 20px/1.6 typography */}
      {subtitle && (
        <p className="font-serif text-[20px] leading-[1.6] text-foreground/70 mb-6">{subtitle}</p>
      )}

      {/* Meta line: date and reading time */}
      <div className="flex items-center gap-4 text-muted-foreground text-sm">
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        <span className="text-border">|</span>
        <span>{readingTime} דקות קריאה</span>
      </div>
    </header>
  )
}
