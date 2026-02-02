# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** One click generates a 3,500+ word investigative report with specific data points, tables, citations, and historical context
**Current focus:** Phase 4 - Polish (Complete)

## Current Position

Phase: 4 of 4 (Polish)
Plan: 2 of 2 in current phase (04-01, 04-02 complete)
Status: Phase complete
Last activity: 2026-02-02 - Completed quick task 002: RTL on all pages and archive link

Progress: [████████████████] 100% (13/13 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 4.1 min
- Total execution time: 53 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 4/4 | 16 min | 4.0 min |
| 02-generation-engine | 5/5 | 20 min | 4.0 min |
| 03-automation | 2/2 | 9 min | 4.5 min |
| 04-polish | 2/2 | 8 min | 4.0 min |

**Recent Trend:**
- Last 5 plans: 03-01 (4m), 03-02 (5m), 04-01 (5m), 04-02 (3m)
- Trend: Consistent

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Decision | Phase-Plan | Rationale |
|----------|------------|-----------|
| Used @supabase/ssr | 01-01 | Modern replacement for deprecated auth-helpers |
| RLS with anon read policies | 01-01 | Public read for published content, internal-only topic_history |
| Day-of-week category mapping | 01-01 | 0-6 integer for rotation schedule |
| Dark mode only (enableSystem=false) | 01-02 | Site is dark-mode-first, ignore system preference |
| Gold accent HSL 43 74% 59% | 01-02 | Premium editorial feel similar to The Atlantic/NYT |
| Playfair Display + Source Sans 3 | 01-02 | Serif headings + sans body for editorial aesthetic |
| Slugify duplicated for heading ID consistency | 01-03 | Extract-headings and report-content both need identical IDs |
| scroll-mt-24 for TOC jump offset | 01-03 | Account for sticky header when navigating via TOC |
| URL state for search/filter | 01-04 | Enables sharing filtered views and browser navigation |
| 300ms debounce on search | 01-04 | Balances responsiveness with URL update frequency |
| Zod v4 type assertion for zod-to-json-schema | 02-02 | Compatibility workaround for schema generation |
| gemini-2.5-flash model | 02-02 | Balance of quality and cost for report generation |
| 15000 char minimum in Zod schema | 02-02 | Enforces 3000+ word report requirement |
| Progress callback pattern | 02-02 | Real-time status updates for async job tracking |
| Route groups for admin protection | 02-01 | (dashboard) group protects /admin while /admin/login remains public |
| getUser() over getSession() | 02-01 | Secure server-side auth validation per Supabase security guidelines |
| google-trends-api with fallback | 02-05 | Unofficial library with graceful empty array on errors |
| 30-day topic history filter | 02-05 | Avoid repetition by filtering recently used topics |
| Category-to-Google-ID mapping | 02-05 | Approximate mapping for trend relevance |
| Admin API auth pattern | 02-03 | getUser() + ADMIN_EMAIL check for API routes |
| Status badge colors | 02-03 | gray=draft, green=published, amber=generating, red=failed |
| Responsive report list | 02-03 | table on desktop, cards on mobile |
| Fire-and-forget async pattern | 02-04 | runGeneration called without await for immediate jobId response |
| SWR polling with state control | 02-04 | useState controls refreshInterval based on job status |
| Progress via database updates | 02-04 | Generation progress persisted to generation_jobs table |
| Permissive INSERT policy for cron_runs | 03-01 | CRON_SECRET validated at API level, RLS INSERT open |
| 6AM UTC weekday schedule | 03-01 | Generate reports before US/EU business hours |
| 30-minute stuck job timeout | 03-02 | Generation typically takes 5-15 min, 30 min is safe threshold |
| UTC dates for idempotency | 03-02 | Ensures consistent behavior regardless of server timezone |
| Shared generation runner | 03-02 | lib/generation/runner.ts used by both admin and cron endpoints |
| File-based OG images | 04-01 | opengraph-image.tsx for Next.js auto-discovery |
| Google Fonts API loading | 04-01 | Load Playfair Display via CSS API for OG images |
| summary_large_image Twitter Card | 04-01 | Maximum visual impact for social sharing |
| schema-dts for JSON-LD types | 04-02 | Official schema.org TypeScript types |
| Organization as author | 04-02 | Transparent about AI-assisted journalism |
| XSS-safe JSON-LD stringify | 04-02 | Escapes < to \u003c for inline scripts |
| section with aria-label | 04-02 | Semantic wrapper for article content accessibility |

### Pending Todos

- Apply 002_generation_jobs.sql migration to Supabase before testing generation
- Apply 003_cron_runs.sql migration to Supabase for cron history tracking
- Set CRON_SECRET environment variable in Vercel production

### Blockers/Concerns

- Budget clarification needed: Research indicates Gemini free tier (5 reports/month) is insufficient for daily production. $20/month minimum for Gemini Advanced recommended. Confirm before Phase 2.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix RTL on article and match regthink font styling | 2026-02-02 | 2b63d28 | [001-fix-rtl-on-article-and-match-regthink-fo](./quick/001-fix-rtl-on-article-and-match-regthink-fo/) |
| 002 | RTL on all pages and archive link | 2026-02-02 | b6e3a42 | [002-rtl-on-all-pages-and-archive-link](./quick/002-rtl-on-all-pages-and-archive-link/) |

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed quick task 002 (RTL on all pages and archive link)
Resume file: None

---
*Project complete! All 13 plans across 4 phases executed successfully.*
