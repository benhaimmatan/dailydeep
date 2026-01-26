import { createClient } from '@/lib/supabase/server'
import { ReportList, type AdminReport } from '@/components/admin/report-list'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Fetch reports with category join directly from Supabase (faster than API call)
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id,
      title,
      slug,
      status,
      published_at,
      created_at,
      word_count,
      category:categories(name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Manage Reports
        </h1>
        <div className="text-sm text-muted-foreground">
          {reports?.length ?? 0} report{(reports?.length ?? 0) !== 1 ? 's' : ''}
        </div>
      </div>

      <ReportList reports={(reports ?? []) as AdminReport[]} />
    </div>
  )
}
