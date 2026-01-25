# The Daily Deep

## What This Is

A premium dark-mode intelligence publishing platform that publishes one deeply researched AI-generated investigative report daily at 6AM UTC. Public readers browse an archive of reports covering geopolitics, economics, technology, climate, society, science, and conflict. Admins trigger report generation via dashboard or automated cron.

## Core Value

One click generates a 3,500+ word investigative report with specific data points, tables, citations, and historical context — matching the quality of manual Gemini Deep Research sessions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Admin can trigger deep research report generation with one click
- [ ] Reports are 3,500-5,000 words with tables, specific data, 10+ sources
- [ ] Daily automated generation at 6AM UTC via cron
- [ ] Home page displays latest published report (or hero CTA if none)
- [ ] Archive page shows all reports in searchable grid, filterable by category, grouped by month
- [ ] Report detail page renders markdown content beautifully with citations
- [ ] Admin dashboard shows stats (total reports, this month, etc.) and report management
- [ ] Admin can delete reports
- [ ] SEO meta tags generated per report (title, description, keywords)
- [ ] Mobile and desktop responsive design
- [ ] Page load under 2 seconds
- [ ] Dark mode with gold accent aesthetic (Economist meets Stratfor)

### Out of Scope

- Podcast script generation — deferred to v2, focus on articles first
- Audio/TTS integration — deferred to v2
- User accounts for readers — public site, no login required
- Comments on reports — not part of original app
- User profiles — not needed
- Subscriptions/paywall — may add later, not v1
- Base44 migration — fresh start, no content to migrate
- OAuth login — admin uses email/password only

## Context

**Origin:** Rebuilding existing Base44 app. Base44's `InvokeLLM` produces shallow 500-1000 word articles despite prompts requesting comprehensive research. Gemini Deep Research API (Interactions API) produces 10x better content with iterative web search.

**Gemini Deep Research API:**
- Uses Interactions API, not `generateContent`
- Agent: `deep-research-pro-preview-12-2025`
- Async execution: `background=true`, poll for results
- Tasks take 5-15 minutes
- Free tier supports 1 report/day (~250k input tokens, ~60k output, ~80 searches)

**Design reference:** Original app has dark mode (#0A0A0A), gold accent (#C9A962), Playfair Display + Inter fonts, category-colored badges, Framer Motion animations.

**Report structure:** Title, subtitle, slug, markdown content, summary, category, regions covered, sources with URLs, reading time, SEO fields, publish date, status.

## Constraints

- **Tech stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, Vercel — chosen for free tiers and modern DX
- **AI provider**: Gemini Interactions API only — free tier, deep research capability
- **Budget**: $0/month target — all services on free tiers
- **Hosting**: Vercel — free tier, native Next.js support, cron jobs
- **Database**: Supabase PostgreSQL — free tier (500MB), built-in auth
- **No feature creep**: Match original app functionality exactly, no additions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemini Deep Research API over standard LLM | Only way to get iterative deep research quality via API | — Pending |
| Supabase over other DBs | Free tier, auth included, PostgreSQL | — Pending |
| Next.js App Router | Modern patterns, API routes colocated, Vercel-native | — Pending |
| Skip podcast for v1 | Reduce scope, focus on core value (articles) | — Pending |
| Public site, admin-only auth | Simplifies auth significantly | — Pending |

---
*Last updated: 2026-01-25 after initialization*
