import type { Source } from '@/types/database'

interface ReportSourcesProps {
  sources: Source[]
}

/**
 * Sources section with numbered citation links
 */
export function ReportSources({ sources }: ReportSourcesProps) {
  if (!sources || sources.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-border/50">
      <h2 className="font-playfair text-xl font-semibold mb-6 text-foreground">
        Sources
      </h2>
      <ol className="list-decimal list-inside space-y-3">
        {sources.map((source, index) => (
          <li key={index} className="text-foreground/80">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              {source.name}
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
