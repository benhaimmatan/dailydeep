'use client'

import { useEffect, useState } from 'react'
import type { Heading } from '@/lib/utils/extract-headings'

interface ReportTOCProps {
  headings: Heading[]
}

/**
 * Sticky table of contents with scroll-based active section highlighting
 */
export function ReportTOC({ headings }: ReportTOCProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // Skip if no headings
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that's intersecting
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      {
        // Trigger when heading is 100px from top of viewport
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0,
      }
    )

    // Observe all heading elements
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [headings])

  // Don't render if no headings
  if (headings.length === 0) return null

  return (
    <nav
      className="sticky top-24 hidden lg:block"
      aria-label="Table of contents"
    >
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
        On This Page
      </h2>
      <ul className="space-y-2 text-sm">
        {headings.map((heading) => {
          const isActive = activeId === heading.id
          const isH3 = heading.level === 3

          return (
            <li key={heading.id} className={isH3 ? 'ml-4' : ''}>
              <a
                href={`#${heading.id}`}
                className={`
                  block py-1 transition-colors
                  ${
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }
                `}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById(heading.id)
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                    // Update URL hash without scrolling
                    window.history.pushState(null, '', `#${heading.id}`)
                  }
                }}
              >
                {heading.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
