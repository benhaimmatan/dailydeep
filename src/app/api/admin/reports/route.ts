import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/reports
 * Returns list of all reports with category data
 * Requires admin authentication
 */
export async function GET() {
  const supabase = await createClient()

  // Verify admin authentication using getUser() (not getSession)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Verify user is the configured admin
  if (user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Fetch reports with category join
  const { data: reports, error } = await supabase
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

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }

  return NextResponse.json({ reports })
}
