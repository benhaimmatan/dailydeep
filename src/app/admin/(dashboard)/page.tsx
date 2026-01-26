import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/admin/stats-cards'

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Get today's day of week (0 = Sunday, 6 = Saturday)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const dayName = DAY_NAMES[dayOfWeek]

  // Fetch today's category
  const { data: category } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('day_of_week', dayOfWeek)
    .single()

  // Fetch total reports count
  const { count: totalReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })

  // Fetch reports published this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const { count: reportsThisMonth } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .gte('published_at', startOfMonth.toISOString())
    .eq('status', 'published')

  // Fetch latest publish date
  const { data: latest } = await supabase
    .from('reports')
    .select('published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="space-y-8">
      {/* Today's Category Banner */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-sm text-muted-foreground mb-1">Today&apos;s Category</div>
        <h2 className="font-heading text-3xl font-bold text-foreground">
          {category ? (
            <>
              <span className="text-accent">{category.name}</span>
              {' '}
              {dayName}
            </>
          ) : (
            <span className="text-muted-foreground">No category assigned</span>
          )}
        </h2>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalReports={totalReports ?? 0}
        reportsThisMonth={reportsThisMonth ?? 0}
        latestPublishDate={latest?.published_at ?? null}
      />

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/reports"
          className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors group"
        >
          <h3 className="font-heading text-xl font-bold text-foreground group-hover:text-accent transition-colors">
            Manage Reports
          </h3>
          <p className="text-muted-foreground mt-2">
            View, edit, and delete published reports
          </p>
        </Link>
        <Link
          href="/admin/generate"
          className="bg-card border border-border rounded-lg p-6 hover:border-accent transition-colors group"
        >
          <h3 className="font-heading text-xl font-bold text-foreground group-hover:text-accent transition-colors">
            Generate Report
          </h3>
          <p className="text-muted-foreground mt-2">
            Create a new investigative report
          </p>
        </Link>
      </div>
    </div>
  )
}
