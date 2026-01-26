import { requireAdmin } from '@/lib/admin/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require admin authentication for all routes in this layout
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="font-heading text-xl font-bold text-foreground">
                Admin Dashboard
              </Link>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
