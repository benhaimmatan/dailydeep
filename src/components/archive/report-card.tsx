import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface ReportCardProps {
  title: string
  slug: string
  categoryName: string
  publishedAt: string
}

/**
 * Report card for archive grid display
 * Minimal design: title, date, category badge
 * Entire card is clickable link to report detail page
 */
export function ReportCard({
  title,
  slug,
  categoryName,
  publishedAt,
}: ReportCardProps) {
  // Format date as "Jan 25, 2026"
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/report/${slug}`}
      className="group block bg-card border border-border/50 rounded-lg p-6 hover:border-primary/50 transition-colors"
    >
      <h3 className="font-playfair text-xl text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {title}
      </h3>
      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        <time dateTime={publishedAt}>{formattedDate}</time>
        <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/30">
          {categoryName}
        </Badge>
      </div>
    </Link>
  )
}
