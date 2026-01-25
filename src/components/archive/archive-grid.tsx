import { ReportCard } from './report-card'

interface ReportData {
  slug: string
  title: string
  categoryName: string
  publishedAt: string
}

interface MonthGroup {
  month: string
  reports: ReportData[]
}

interface ArchiveGridProps {
  groupedReports: MonthGroup[]
}

/**
 * Archive grid displaying reports grouped by month
 * Responsive: 1 column mobile, 2 columns tablet, 3 columns desktop
 */
export function ArchiveGrid({ groupedReports }: ArchiveGridProps) {
  if (groupedReports.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">No reports found</p>
        <p className="text-muted-foreground/70 text-sm mt-2">
          Try adjusting your search or filter criteria
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {groupedReports.map((group) => (
        <section key={group.month}>
          <h2 className="font-playfair text-xl text-foreground mb-6 border-b border-border pb-2">
            {group.month}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.reports.map((report) => (
              <ReportCard
                key={report.slug}
                title={report.title}
                slug={report.slug}
                categoryName={report.categoryName}
                publishedAt={report.publishedAt}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
