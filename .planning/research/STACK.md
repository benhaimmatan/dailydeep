# Technology Stack

**Project:** The Daily Deep - AI-Powered Intelligence Publishing Platform
**Researched:** 2026-01-25
**Overall Confidence:** HIGH

---

## Executive Summary

The proposed stack (Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Vercel) is validated with one critical recommendation: **upgrade to Next.js 15.5.9** for security patches and Turbopack improvements. The $0/month target is achievable with careful architecture around the Gemini Deep Research API's async nature.

**Critical finding:** Gemini Deep Research takes 5-15 minutes per report. Vercel Hobby (free) allows 5-minute max function duration with Fluid Compute. This requires a **two-phase polling architecture** rather than a single long-running function.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.5.9 | Full-stack React framework | Latest security patches (CVE-2025-55184, CVE-2025-55183), Turbopack stable, App Router mature. 15.x over 14.x for security; 15.x over 16.x for stability on free tier. | HIGH |
| TypeScript | ^5.6.0 | Type safety | Next.js 15.5 has improved route types. Native support, no config needed. | HIGH |
| React | 19.x | UI library | Bundled with Next.js 15. React Compiler provides auto-memoization. | HIGH |

### Styling & UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility-first CSS | CSS-first config (no tailwind.config.ts), 3-10x faster builds. Next.js 15.5 native support. | HIGH |
| shadcn/ui | latest (CLI) | Component library | Not a package - copies components into your codebase. Full React 19 + Tailwind v4 compatibility. Radix UI primitives. | HIGH |
| next-themes | ^0.4.x | Dark mode | Recommended by shadcn/ui for theme management. SSR-compatible. | HIGH |
| lucide-react | ^0.469.x | Icons | Default icon library for shadcn/ui. Tree-shakeable. | HIGH |

### Database & Auth

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase | - | PostgreSQL + Auth + Realtime | 500MB free database, 50K MAUs, built-in auth. Postgres extensions (pg_cron) available. | HIGH |
| @supabase/supabase-js | ^2.x | Supabase client | Core SDK. | HIGH |
| @supabase/ssr | ^0.5.x | Server-side auth | Required for Next.js App Router SSR. Handles cookie-based sessions. | HIGH |

### AI Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @google/genai | ^1.37.x | Gemini API client | New unified SDK (replaces deprecated @google/generative-ai). Includes Interactions API for Deep Research agent. | HIGH |

### Content Rendering

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-markdown | ^9.x | Markdown rendering | Safe rendering (no dangerouslySetInnerHTML), plugin ecosystem. | HIGH |
| remark-gfm | ^4.x | GitHub Flavored Markdown | Tables, task lists, strikethrough support. | HIGH |
| rehype-highlight | ^7.x | Syntax highlighting | Code block styling in reports. | MEDIUM |
| rehype-raw | ^7.x | Raw HTML in markdown | For embedded content if needed. Use with rehype-sanitize. | MEDIUM |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | - | Hosting + Edge + Cron | Native Next.js support. Free tier: 100 cron jobs (hourly precision), 5-min function timeout (Fluid Compute), 100GB bandwidth. | HIGH |

---

## Installation Commands

```bash
# Create Next.js 15 project with TypeScript and Tailwind v4
npx create-next-app@15.5.9 dailydeep --typescript --tailwind --eslint --app --src-dir

# Navigate to project
cd dailydeep

# Initialize shadcn/ui (will prompt for Tailwind v4 compatibility)
npx shadcn@latest init

# Install Supabase packages
npm install @supabase/supabase-js @supabase/ssr

# Install Gemini SDK
npm install @google/genai

# Install markdown rendering
npm install react-markdown remark-gfm rehype-highlight

# Install theme management
npm install next-themes

# Dev dependencies
npm install -D @types/node
```

---

## Critical Architecture Decision: Async Report Generation

### The Problem

Gemini Deep Research API:
- Takes 5-15 minutes per report (up to 60 min max)
- Requires `background: true` for async execution
- Returns interaction ID immediately, must poll for results

Vercel Hobby (free tier):
- 5-minute max function duration (with Fluid Compute)
- 100 cron jobs allowed (hourly precision)

**A single function cannot wait for report completion.**

### The Solution: Two-Phase Polling Architecture

```
Phase 1: Initiate (Cron job at 6AM UTC)
[Vercel Cron] --> [/api/reports/initiate] --> [Gemini API: create interaction]
                                          --> [Supabase: insert job row with status='pending']
                                          --> Return immediately (<10 sec)

Phase 2: Poll (Cron job every 5 minutes, 6:05-7:00 UTC)
[Vercel Cron] --> [/api/reports/poll] --> [Supabase: find pending jobs]
                                      --> [Gemini API: check interaction status]
                                      --> If completed: update DB with report content
                                      --> If still running: do nothing (next poll will check)
```

### Database Schema for Job Tracking

```sql
CREATE TABLE report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id TEXT NOT NULL,        -- Gemini interaction ID
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'pending',       -- pending, running, completed, failed
  poll_count INTEGER DEFAULT 0,        -- Zombie detection (>60 = stuck)
  report_id UUID REFERENCES reports(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### vercel.json Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/reports/initiate",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/reports/poll",
      "schedule": "5,10,15,20,25,30,35,40,45,50,55 6 * * *"
    },
    {
      "path": "/api/reports/poll",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Note:** Hobby plan hourly precision means the 6AM job runs sometime 6:00-6:59. This is acceptable since reports publish "daily" not at exact time.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Framework | Next.js 15.5.9 | Next.js 14 | Security vulnerabilities patched in 15.x. No reason to use older version. |
| Framework | Next.js 15.5.9 | Next.js 16 | Too new (released Oct 2025). Less battle-tested on free tier. 15.x is mature. |
| CSS | Tailwind v4 | Tailwind v3 | v4 is faster, simpler config. New projects should use v4. |
| Database | Supabase | PlanetScale | Supabase includes auth + realtime. PlanetScale removed free tier in 2024. |
| Database | Supabase | Neon | Similar capabilities, but Supabase has better auth integration + pg_cron. |
| AI SDK | @google/genai | @google/generative-ai | Old SDK deprecated Aug 2025. No Interactions API support. |
| AI SDK | @google/genai | LangChain | Unnecessary abstraction. Direct SDK is simpler for single-provider use. |
| Markdown | react-markdown | MDX | MDX is for embedding React components. Reports are pure content - react-markdown simpler. |
| Hosting | Vercel | Railway | Railway removed free tier. Vercel free tier excellent for Next.js. |
| Hosting | Vercel | Cloudflare Pages | Vercel has native cron jobs. CF would need Workers for scheduled tasks. |

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| @google/generative-ai | Deprecated. Support ends Aug 2025. No Interactions API. |
| tailwindcss-animate | Incompatible with Tailwind v4. Use tw-animate-css instead. |
| Prisma | Overkill for this project. Supabase client is sufficient. Adds build complexity. |
| tRPC | Unnecessary for admin-only API. Simple API routes are cleaner. |
| NextAuth.js | Supabase Auth is simpler for single-provider (email/password) auth. |
| Inngest/Upstash Workflow | Adds complexity + potential cost. Two-phase polling with Vercel cron is free. |
| Redis | Not needed. Supabase Postgres handles job queue via table. |
| Bull/BullMQ | Requires Redis. Postgres table queue is simpler. |

---

## Version Compatibility Notes

### Next.js 15.5 + React 19 + Tailwind v4 + shadcn/ui

This combination is fully compatible as of Jan 2026. shadcn/ui CLI handles the setup.

**Important:** When running `npx shadcn@latest init`, the CLI will detect Tailwind v4 and configure appropriately. Accept defaults.

### Supabase SSR Setup

Requires specific file structure:

```
/lib/supabase/
  client.ts    # Browser client (createBrowserClient)
  server.ts    # Server client (createServerClient)
  middleware.ts # Session refresh proxy
```

Middleware is **required** to refresh auth tokens. Without it, sessions expire unexpectedly.

### Gemini SDK Requirements

- `@google/genai` >= 1.55.0 for Interactions API support
- API key required: `GOOGLE_API_KEY` or `GEMINI_API_KEY` env var
- Model ID: `deep-research-pro-preview-12-2025` (preview, may change)

### Security Patches

**Apply immediately:** Next.js 15.5.9 patches CVE-2025-55184 (DoS) and CVE-2025-55183 (source code exposure) in React Server Components.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini
GOOGLE_API_KEY=AIza...

# Vercel Cron (auto-set by Vercel)
CRON_SECRET=auto-generated
```

---

## Free Tier Limits Summary

| Service | Limit | Project Usage |
|---------|-------|---------------|
| Vercel Functions | 100 hours/month | ~30 reports/month @ 5min each = 2.5 hrs |
| Vercel Bandwidth | 100 GB/month | Reports are text - easily within limit |
| Vercel Cron | 100 jobs, hourly precision | ~15 cron jobs needed (1 initiate + ~12 polls/day) |
| Supabase Database | 500 MB | Reports ~50KB each = 10,000 reports |
| Supabase Auth | 50K MAUs | Admin-only = 1 user |
| Supabase Bandwidth | 10 GB/month | Easily within limit |
| Gemini Deep Research | ~250K input + 60K output tokens/day | 1 report/day = within limit |

**Verdict:** $0/month target is achievable with this architecture.

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [Next.js Security Update Dec 2025](https://nextjs.org/blog/security-update-2025-12-11)
- [Gemini Deep Research Agent Docs](https://ai.google.dev/gemini-api/docs/deep-research)
- [Gemini Interactions API Docs](https://ai.google.dev/gemini-api/docs/interactions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Function Duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Supabase SSR Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui React 19 Support](https://ui.shadcn.com/docs/react-19)
- [@google/genai npm](https://www.npmjs.com/package/@google/genai)

### Architecture References (MEDIUM confidence)
- [Deep Research Factory Architecture Guide](https://www.productiveai.com/deep-research-factory-system-architecture-guide/)
- [Tailwind v4 Migration Guide](https://medium.com/better-dev-nextjs-react/tailwind-v4-migration-from-javascript-config-to-css-first-in-2025-ff3f59b215ca)
- [Supabase Background Jobs Pattern](https://www.jigz.dev/blogs/how-i-solved-background-jobs-using-supabase-tables-and-edge-functions)

### Pricing/Limits (verified Jan 2026)
- [Vercel Pricing](https://vercel.com/pricing)
- [Supabase Pricing](https://supabase.com/pricing)
