'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export interface AdminReport {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'generating' | 'failed'
  published_at: string | null
  created_at: string
  word_count: number | null
  category: { name: string } | { name: string }[] | null
}

interface ReportListProps {
  reports: AdminReport[]
}

function getCategoryName(category: AdminReport['category']): string {
  if (!category) return '-'
  if (Array.isArray(category)) {
    return category[0]?.name ?? '-'
  }
  return category.name
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: AdminReport['status'] }) {
  const variants: Record<AdminReport['status'], { className: string; label: string }> = {
    draft: {
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      label: 'Draft',
    },
    published: {
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
      label: 'Published',
    },
    generating: {
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
      label: 'Generating',
    },
    failed: {
      className: 'bg-red-500/20 text-red-400 border-red-500/30',
      label: 'Failed',
    },
  }

  const { className, label } = variants[status] ?? variants.draft

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

export function ReportList({ reports }: ReportListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        console.error('Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (reports.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <h3 className="font-heading text-xl text-foreground mb-2">No Reports Yet</h3>
        <p className="text-muted-foreground">
          Generate your first report to see it here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium text-muted-foreground">Title</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Published</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Words</th>
              <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className="border-t border-border hover:bg-muted/30 transition-colors"
              >
                <td className="p-4">
                  <Link
                    href={`/report/${report.slug}`}
                    className="text-foreground hover:text-accent transition-colors font-medium"
                  >
                    {report.title}
                  </Link>
                </td>
                <td className="p-4 text-muted-foreground">
                  {getCategoryName(report.category)}
                </td>
                <td className="p-4">
                  <StatusBadge status={report.status} />
                </td>
                <td className="p-4 text-muted-foreground">
                  {formatDate(report.published_at)}
                </td>
                <td className="p-4 text-muted-foreground">
                  {report.word_count?.toLocaleString() ?? '-'}
                </td>
                <td className="p-4 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                        disabled={deletingId === report.id}
                      >
                        {deletingId === report.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Report</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{report.title}&quot;?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(report.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-border">
        {reports.map((report) => (
          <div key={report.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <Link
                href={`/report/${report.slug}`}
                className="text-foreground hover:text-accent transition-colors font-medium"
              >
                {report.title}
              </Link>
              <StatusBadge status={report.status} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Category: {getCategoryName(report.category)}</div>
              <div>Published: {formatDate(report.published_at)}</div>
              <div>Words: {report.word_count?.toLocaleString() ?? '-'}</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  disabled={deletingId === report.id}
                >
                  {deletingId === report.id ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Report</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{report.title}&quot;?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(report.id)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  )
}
