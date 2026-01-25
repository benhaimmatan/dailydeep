---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [react-markdown, remark-gfm, intersection-observer, ssr, seo]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Supabase server client, database types
  - phase: 01-foundation/01-02
    provides: Dark mode design system, Playfair font, gold accents
provides:
  - Report detail page at /report/[slug]
  - Markdown rendering with editorial styling
  - Sticky table of contents with scroll tracking
  - SSR metadata for SEO
affects: [02-reports, 03-deployment]

# Tech tracking
tech-stack:
  added: [react-markdown, remark-gfm, reading-time]
  patterns: [custom ReactMarkdown components, IntersectionObserver scroll tracking]

key-files:
  created:
    - src/app/report/[slug]/page.tsx
    - src/components/report/report-content.tsx
    - src/components/report/report-header.tsx
    - src/components/report/report-toc.tsx
    - src/components/report/report-sources.tsx
    - src/lib/utils/reading-time.ts
    - src/lib/utils/format-date.ts
    - src/lib/utils/extract-headings.ts
  modified: [package.json]

key-decisions:
  - "Slugify function duplicated in extract-headings and report-content for consistent heading IDs"
  - "TOC uses scroll-mt-24 offset to account for sticky header space"
  - "External links detected via http prefix for target=_blank"

patterns-established:
  - "Custom ReactMarkdown components pattern for styled markdown"
  - "IntersectionObserver pattern for scroll-aware navigation"
  - "Two-column layout: main content + sidebar TOC"

# Metrics
duration: 4min
completed: 2026-01-25
---

# Phase 01 Plan 03: Report Detail Page Summary

**Report detail page with ReactMarkdown editorial styling, sticky TOC with IntersectionObserver, and SSR metadata for SEO**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-25T09:00:00Z
- **Completed:** 2026-01-25T09:04:00Z
- **Tasks:** 3
- **Files created:** 8

## Accomplishments
- Markdown rendering with Playfair headings, gold accents, minimal table borders
- Blockquotes with gold left border, external links open in new tab
- Sticky table of contents highlights active section while scrolling
- SSR data fetching with category join and 404 for unpublished reports
- Dynamic SEO metadata generation (title, description, OpenGraph)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install markdown dependencies and create utility functions** - `8a88fe2` (feat)
2. **Task 2: Create markdown renderer and report components** - `c52b78a` (feat)
3. **Task 3: Create report detail page with SSR data fetching** - `eed655e` (feat)

## Files Created/Modified
- `src/lib/utils/reading-time.ts` - Calculate reading time from content
- `src/lib/utils/format-date.ts` - Format dates in editorial style (January 25, 2026)
- `src/lib/utils/extract-headings.ts` - Extract h2/h3 headings for TOC
- `src/components/report/report-content.tsx` - ReactMarkdown with custom styled components
- `src/components/report/report-header.tsx` - Title, category badge, date, reading time
- `src/components/report/report-toc.tsx` - Sticky sidebar with IntersectionObserver
- `src/components/report/report-sources.tsx` - Numbered citation links
- `src/app/report/[slug]/page.tsx` - Dynamic route with SSR, metadata, two-column layout
- `package.json` - Added react-markdown, remark-gfm, reading-time

## Decisions Made
- Slugify function duplicated in extract-headings and report-content to ensure heading IDs match between TOC links and rendered headings
- Used scroll-mt-24 on headings to offset for potential sticky header when jumping via TOC
- External links detected by checking if href starts with "http" rather than comparing to current domain

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None - all dependencies installed successfully, TypeScript compilation passed on first attempt.

## User Setup Required
None - no external service configuration required. Report page will work once Supabase is configured (from 01-01).

## Next Phase Readiness
- Report detail page complete and ready for report data
- Requires published reports in database to display content
- Home page (01-04) can now link to report detail pages

---
*Phase: 01-foundation*
*Completed: 2026-01-25*
