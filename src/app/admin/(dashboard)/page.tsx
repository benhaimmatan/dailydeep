import { createClient } from '@/lib/supabase/server'

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

      {/* Welcome Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
          Welcome to Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage reports, trigger test generations, and monitor system status.
          This dashboard will be enhanced with report management in upcoming plans.
        </p>
      </div>
    </div>
  )
}
