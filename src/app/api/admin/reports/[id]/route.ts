import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/admin/reports/[id]
 * Deletes a report by ID
 * Requires admin authentication
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

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

  // Delete the report
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
