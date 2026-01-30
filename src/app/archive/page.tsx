import { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SearchInput } from '@/components/archive/search-input'
import { CategoryFilter } from '@/components/archive/category-filter'
import { ArchiveGrid } from '@/components/archive/archive-grid'
import type { Category, ReportWithCategory } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Archive | The Daily Deep',
  description: 'Browse all published investigative reports',
}

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string }>
}

/**
 * Group reports by month/year
 */
function groupReportsByMonth(reports: ReportWithCategory[]) {
  const groups: Map<string, ReportWithCategory[]> = new Map()

  for (const report of reports) {
    const date = new Date(report.published_at || report.created_at)
    const monthYear = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })

    const existing = groups.get(monthYear) || []
    groups.set(monthYear, [...existing, report])
  }

  // Convert to array format expected by ArchiveGrid
  return Array.from(groups.entries()).map(([month, reports]) => ({
    month,
    reports: reports.map((r) => ({
      slug: r.slug,
      title: r.title,
      categoryName: r.category?.name ?? 'Uncategorized',
      publishedAt: r.published_at || r.created_at,
    })),
  }))
}

/**
 * Archive page with search, category filtering, and grouped grid
 */
export default async function ArchivePage({ searchParams }: PageProps) {
  const { q, category } = await searchParams
  const supabase = await createClient()

  // Fetch all categories for filter chips
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  // Build query for published reports
  let query = supabase
    .from('reports')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  // Apply category filter if specified
  if (category) {
    // First get the category ID from slug
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()

    if (categoryData) {
      query = query.eq('category_id', categoryData.id)
    }
  }

  // Apply search filter using ILIKE on title
  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  const { data: reports } = await query

  // Group reports by month
  const groupedReports = groupReportsByMonth(
    (reports as ReportWithCategory[]) || []
  )

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-4xl md:text-5xl text-foreground mb-8">
        Archive
      </h1>

      {/* Search and filter controls */}
      <div className="space-y-4 mb-8">
        <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md" />}>
          <SearchInput />
        </Suspense>

        <Suspense fallback={<div className="h-8 bg-muted animate-pulse rounded-full w-48" />}>
          <CategoryFilter categories={(categories as Category[]) || []} />
        </Suspense>
      </div>

      {/* Reports grid grouped by month */}
      <ArchiveGrid groupedReports={groupedReports} />
    </main>
  )
}
