/**
 * Stats Cards - Admin Dashboard Statistics Display
 * Server component that displays report statistics in a grid layout
 */

interface StatsCardsProps {
  totalReports: number
  reportsThisMonth: number
  latestPublishDate: string | null
}

function formatDate(date: string | null): string {
  if (!date) return 'None'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function StatsCards({
  totalReports,
  reportsThisMonth,
  latestPublishDate,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Total Reports',
      value: totalReports.toString(),
      description: 'All time',
    },
    {
      label: 'This Month',
      value: reportsThisMonth.toString(),
      description: 'Published reports',
    },
    {
      label: 'Latest Publish',
      value: formatDate(latestPublishDate),
      description: 'Most recent',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-lg p-5"
        >
          <div className="text-sm text-muted-foreground mb-1">
            {stat.label}
          </div>
          <div className="font-heading text-2xl font-bold text-accent">
            {stat.value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stat.description}
          </div>
        </div>
      ))}
    </div>
  )
}
