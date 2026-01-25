import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { HeroCTA } from '@/components/home/hero-cta'
import { LatestReport } from '@/components/home/latest-report'
import { calculateReadingTime } from '@/lib/utils/reading-time'
import type { ReportWithCategory } from '@/types/database'

export const metadata: Metadata = {
  title: 'The Daily Deep | Premium Investigative Reports',
  description:
    'AI-powered investigative reports covering geopolitics, economics, technology, climate, and more. Published daily.',
}

/**
 * Home page displaying latest published report or hero CTA
 */
export default async function Home() {
  const supabase = await createClient()

  // Get the most recent published report
  const { data: report } = await supabase
    .from('reports')
    .select('*, category:categories(*)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  // If no published reports, show hero CTA
  if (!report) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <HeroCTA />
      </main>
    )
  }

  // Calculate reading time
  const readingTime =
    report.reading_time ?? calculateReadingTime(report.content)

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <LatestReport
        report={report as ReportWithCategory}
        readingTime={readingTime}
      />
    </main>
  )
}
