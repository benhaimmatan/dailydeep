'use client'

import { useEffect, useRef, useState } from 'react'

interface MermaidDiagramProps {
  chart: string
}

/**
 * Renders Mermaid diagrams with dynamic import to avoid SSR issues.
 * Uses dark theme with gold (#C9A962) accent matching site colors.
 */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function renderChart() {
      if (!containerRef.current) return

      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import('mermaid')).default

        // Initialize with dark theme and gold colors
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            // Gold accent color matching the site
            primaryColor: '#C9A962',
            primaryTextColor: '#1a1a1a',
            primaryBorderColor: '#C9A962',
            lineColor: '#C9A962',
            secondaryColor: '#2a2a2a',
            tertiaryColor: '#1a1a1a',
            // Text colors
            textColor: '#e5e5e5',
            // Background
            background: '#1a1a1a',
            mainBkg: '#1a1a1a',
            // Pie chart colors
            pie1: '#C9A962',
            pie2: '#8B7355',
            pie3: '#6B5B4F',
            pie4: '#4A4A4A',
            pie5: '#3A3A3A',
            pie6: '#2A2A2A',
            pie7: '#DAB978',
            pie8: '#B8956E',
            // XY chart colors
            xyChart: {
              backgroundColor: 'transparent',
              plotColorPalette: '#C9A962',
            },
          },
          // Responsive settings
          flowchart: {
            useMaxWidth: true,
          },
          sequence: {
            useMaxWidth: true,
          },
        })

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`

        // Render the chart
        const { svg } = await mermaid.render(id, chart)

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Mermaid rendering error:', err)
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
          setIsLoading(false)
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart])

  // Error fallback - show raw code
  if (error) {
    return (
      <figure className="my-8">
        <div className="bg-muted rounded-md p-4 overflow-x-auto">
          <p className="text-sm text-foreground/60 mb-2">
            Chart could not be rendered:
          </p>
          <pre className="text-sm font-mono text-foreground/80">
            <code>{chart}</code>
          </pre>
        </div>
      </figure>
    )
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <figure className="my-8">
        <div className="bg-muted rounded-md p-8 animate-pulse">
          <div className="h-48 bg-foreground/10 rounded flex items-center justify-center">
            <span className="text-foreground/40 text-sm">Loading chart...</span>
          </div>
        </div>
      </figure>
    )
  }

  return (
    <figure className="my-8 max-w-full overflow-x-auto">
      <div
        ref={containerRef}
        className="mermaid-container flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
      />
    </figure>
  )
}
