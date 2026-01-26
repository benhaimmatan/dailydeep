# Roadmap: The Daily Deep

## Overview

This roadmap transforms The Daily Deep from concept to production-ready publishing platform across 4 phases. Phase 1 establishes the foundation with database, security, public pages, and content display. Phase 2 builds the generation engine with Gemini Interactions API, async polling, and admin controls. Phase 3 adds daily automation via Vercel cron. Phase 4 polishes SEO and discoverability. Each phase delivers a coherent, verifiable capability.

## Phases

- [x] **Phase 1: Foundation** - Database, RLS security, public pages, content display
- [x] **Phase 2: Generation Engine** - Gemini AI integration, async polling, admin dashboard
- [x] **Phase 3: Automation** - Daily 6AM UTC cron with idempotency
- [x] **Phase 4: Polish** - SEO meta tags, structured data, discoverability

## Phase Details

### Phase 1: Foundation
**Goal**: Public readers can browse a dark-mode archive of beautifully rendered reports
**Depends on**: Nothing (first phase)
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISC-01, DISC-02, DISC-03, DISC-04, PAGE-01, PAGE-02, PAGE-03, SEC-01, TOPIC-01, TOPIC-05
**Success Criteria** (what must be TRUE):
  1. User can visit home page and see latest published report (or hero CTA if none exist)
  2. User can view any report with proper typography, tables, citations, and dark mode styling
  3. User can search archive by title/content and filter by category
  4. User can browse reports grouped by month with responsive layout on mobile and desktop
  5. Database has RLS enabled preventing unauthorized write access
  6. Database stores category rotation schedule (7 categories for 7 days of the week)
  7. Database tracks topic history to prevent repetition

**Plans:** 4 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md - Database schema, RLS security, Supabase client setup (Wave 1)
- [x] 01-02-PLAN.md - Dark mode design system, fonts, theme provider (Wave 1)
- [x] 01-03-PLAN.md - Report detail page with markdown rendering and sticky TOC (Wave 2)
- [x] 01-04-PLAN.md - Home page and archive with search/filter (Wave 3)

### Phase 2: Generation Engine
**Goal**: Admin can trigger AI report generation and manage published content
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-05, PAGE-04, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, SEC-02, TOPIC-02, TOPIC-03, TOPIC-04
**Success Criteria** (what must be TRUE):
  1. Admin can log in with email/password and access protected dashboard
  2. Admin can trigger report generation with one click and see real-time progress during 5-15 minute generation
  3. Generated reports are validated for quality (3000+ words, has sources) before publishing
  4. Admin can view report list with status badges and delete reports
  5. Dashboard shows stats: total reports, reports this month, latest publish date
  6. System queries Google Trends API to discover trending topics within daily category
  7. Admin can override/adjust the daily topic before triggering generation

**Plans:** 5 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md - Admin authentication and protected routes (Wave 1)
- [x] 02-02-PLAN.md - Gemini client, schemas, and generation_jobs table (Wave 1)
- [x] 02-03-PLAN.md - Admin dashboard with stats and report management (Wave 2)
- [x] 02-04-PLAN.md - Generation trigger with progress feedback and quality validation (Wave 2)
- [x] 02-05-PLAN.md - Google Trends integration and topic selection (Wave 1)

### Phase 3: Automation
**Goal**: Platform publishes new report automatically every day at 6AM UTC (weekdays only)
**Depends on**: Phase 2
**Requirements**: GEN-04, SEC-03
**Success Criteria** (what must be TRUE):
  1. Cron job triggers at 6AM UTC daily and initiates report generation
  2. Cron endpoint rejects unauthorized requests (validates CRON_SECRET)
  3. System prevents duplicate reports when cron runs multiple times
  4. Failed generations are detected and logged for admin review

**Plans:** 2 plans in 1 wave

Plans:
- [x] 03-01-PLAN.md - Cron infrastructure: database migration, vercel.json, TypeScript types (Wave 1)
- [x] 03-02-PLAN.md - Cron utilities, generation runner, secured endpoint, retry button (Wave 1)

### Phase 4: Polish
**Goal**: Reports are discoverable via search engines with proper metadata
**Depends on**: Phase 1
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04
**Success Criteria** (what must be TRUE):
  1. Each report page has unique meta title, description, and keywords
  2. Reports have OpenGraph and Twitter Card meta tags for social sharing
  3. Report pages use semantic HTML structure (article, section, proper headings)
  4. Reports include JSON-LD Article structured data for rich search results

**Plans:** 2 plans in 1 wave

Plans:
- [x] 04-01-PLAN.md - Dynamic meta tags, Twitter Cards, OG image generation (Wave 1)
- [x] 04-02-PLAN.md - Semantic HTML structure and JSON-LD Article schema (Wave 1)

## Progress

**Execution Order:** Phases 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-01-25 |
| 2. Generation Engine | 5/5 | Complete | 2026-01-26 |
| 3. Automation | 2/2 | Complete | 2026-01-26 |
| 4. Polish | 2/2 | Complete | 2026-01-26 |

## Coverage Summary

**Total v1 Requirements:** 34
**Mapped to Phases:** 34
**Unmapped:** 0

| Category | Count | Phase(s) |
|----------|-------|----------|
| Content Display (DISP) | 4 | Phase 1 |
| Content Discovery (DISC) | 4 | Phase 1 |
| Pages (PAGE) | 4 | Phase 1 (3), Phase 2 (1) |
| Generation (GEN) | 5 | Phase 2 (4), Phase 3 (1) |
| SEO | 4 | Phase 4 |
| Admin (ADMIN) | 5 | Phase 2 |
| Security (SEC) | 3 | Phase 1 (1), Phase 2 (1), Phase 3 (1) |
| Topic Discovery (TOPIC) | 5 | Phase 1 (2), Phase 2 (3) |

---
*Roadmap created: 2026-01-25*
*Last updated: 2026-01-26 - Phase 4 execution complete (2/2 plans verified) - MILESTONE COMPLETE*
