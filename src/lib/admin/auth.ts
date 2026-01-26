import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Require admin authentication for protected routes.
 * Uses getUser() for secure server-side validation (not getSession).
 * Redirects to /admin/login if not authenticated or not the admin user.
 */
export async function requireAdmin() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/admin/login')
  }

  // Verify user is the configured admin
  if (user.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login')
  }

  return user
}
