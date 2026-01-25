# Architecture Patterns

**Domain:** AI-powered premium intelligence publishing platform
**Researched:** 2026-01-25
**Confidence:** HIGH (verified with official documentation)

## System Overview

```
                                    DAILY DEEP ARCHITECTURE

    +------------------+      +------------------+      +------------------+
    |   Public Pages   |      |   Admin Pages    |      |   Scheduled      |
    |                  |      |                  |      |   Triggers       |
    |  / (Home)        |      |  /admin          |      |                  |
    |  /archive        |      |  - Dashboard     |      |  Vercel Cron     |
    |  /report/[slug]  |      |  - Generate      |      |  (6AM UTC)       |
    +--------+---------+      +--------+---------+      +--------+---------+
             |                         |                         |
             v                         v                         v
    +------------------------------------------------------------------------+
    |                         Next.js App Router                              |
    |   +------------------+  +------------------+  +------------------+      |
    |   | Server           |  | API Routes       |  | Server           |      |
    |   | Components       |  |                  |  | Actions          |      |
    |   | (Data Fetching)  |  | /api/cron        |  | (Mutations)      |      |
    |   +--------+---------+  | /api/generate    |  +--------+---------+      |
    |            |            +--------+---------+           |                |
    +------------------------------------------------------------------------+
                 |                     |                     |
                 v                     v                     v
    +------------------+      +------------------+      +------------------+
    |   Supabase       |      |   Gemini         |      |   Supabase       |
    |   (Read)         |      |   Interactions   |      |   (Write)        |
    |                  |      |   API            |      |                  |
    |  - Fetch reports |      |  - Start task    |      |  - Save reports  |
    |  - Get by slug   |      |  - Poll status   |      |  - Delete        |
    |  - List archive  |      |  - Get result    |      |  - Update status |
    +------------------+      +------------------+      +------------------+
```

## Component Responsibilities

| Component | Responsibility | Communicates With | Build Phase |
|-----------|---------------|-------------------|-------------|
| **Public Pages** | Display reports to readers | Supabase (read) | Phase 1 |
| **Admin Pages** | Manage reports, trigger generation | API routes, Supabase | Phase 2 |
| **API Routes** | Handle cron webhooks, orchestrate generation | Gemini API, Supabase | Phase 2 |
| **Server Components** | Fetch and render data on server | Supabase | Phase 1 |
| **Server Actions** | Handle mutations (delete reports) | Supabase | Phase 2 |
| **Supabase Client** | Database operations | PostgreSQL | Phase 1 |
| **Gemini Integration** | AI content generation | Gemini Interactions API | Phase 2 |
| **Markdown Renderer** | Render report content beautifully | react-markdown/MDX | Phase 1 |

## Recommended Project Structure

```
dailydeep/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Route group: public pages
│   │   │   ├── layout.tsx            # Public layout (header, footer)
│   │   │   ├── page.tsx              # Home: latest report or hero
│   │   │   ├── archive/
│   │   │   │   └── page.tsx          # Archive: searchable grid
│   │   │   └── report/
│   │   │       └── [slug]/
│   │   │           └── page.tsx      # Report detail
│   │   │
│   │   ├── admin/                    # Admin area (protected)
│   │   │   ├── layout.tsx            # Admin layout
│   │   │   └── page.tsx              # Dashboard + controls
│   │   │
│   │   ├── api/                      # API routes
│   │   │   ├── cron/
│   │   │   │   └── route.ts          # Vercel cron endpoint (6AM UTC)
│   │   │   └── generate/
│   │   │       ├── route.ts          # Start generation (POST)
│   │   │       └── [id]/
│   │   │           └── route.ts      # Poll status (GET)
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global styles
│   │   └── not-found.tsx             # 404 page
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   └── nav.tsx
│   │   │
│   │   └── report/                   # Report-specific components
│   │       ├── report-card.tsx       # Card for archive grid
│   │       ├── report-content.tsx    # Markdown renderer
│   │       ├── report-metadata.tsx   # Category, date, reading time
│   │       └── report-sources.tsx    # Source citations list
│   │
│   ├── lib/                          # Utilities and clients
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   └── middleware.ts         # Auth middleware
│   │   │
│   │   ├── gemini/
│   │   │   ├── client.ts             # Gemini API client
│   │   │   ├── interactions.ts       # Interactions API helpers
│   │   │   └── prompts.ts            # Report generation prompts
│   │   │
│   │   ├── utils.ts                  # General utilities
│   │   └── constants.ts              # App constants
│   │
│   ├── actions/                      # Server Actions
│   │   ├── reports.ts                # Report CRUD actions
│   │   └── generation.ts             # Generation actions
│   │
│   └── types/                        # TypeScript types
│       ├── report.ts                 # Report type definitions
│       └── database.ts               # Supabase generated types
│
├── public/                           # Static assets
│   ├── fonts/                        # Playfair Display, Inter
│   └── og-image.png                  # Default OG image
│
├── supabase/                         # Supabase configuration
│   ├── migrations/                   # Database migrations
│   │   └── 001_create_reports.sql
│   └── seed.sql                      # Optional seed data
│
├── vercel.json                       # Cron job configuration
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json
```

### Key Structural Decisions

| Decision | Rationale |
|----------|-----------|
| Route groups `(public)` | Separates public layout from admin without affecting URLs |
| `src/` directory | Separates app code from config files at root |
| `lib/` not `utils/` | Avoids the "utils black hole" anti-pattern |
| Separate `actions/` folder | Keeps Server Actions organized, not scattered in components |
| `components/report/` | Feature-based organization for report-specific components |
| `supabase/` at root | Supabase CLI convention for migrations |

## Architectural Patterns

### Pattern 1: Server Components for Data Fetching

All page components should be Server Components by default. Fetch data directly from Supabase on the server, avoiding client-side loading states for initial render.

**When to use:** All page-level data fetching (report lists, single report)

**Example:**
```typescript
// src/app/(public)/archive/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function ArchivePage() {
  const supabase = await createServerClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'published')
    .order('publish_date', { ascending: false })

  return <ReportGrid reports={reports ?? []} />
}
```

**Benefits:**
- No loading spinners for initial page load
- Better SEO (content in initial HTML)
- Smaller client-side JavaScript bundle
- Direct database access (no API layer needed for reads)

### Pattern 2: Async Request-Reply for AI Generation

The Gemini Interactions API requires asynchronous polling for long-running tasks (5-15 minutes). Implement the Async Request-Reply pattern.

**Flow:**
```
1. Client initiates → POST /api/generate
2. Server starts Gemini task (background=true) → Returns interaction ID
3. Client polls → GET /api/generate/[id] every 10-15 seconds
4. Server checks Gemini status → Returns current state
5. On completion → Server saves to Supabase, returns success
6. Client refreshes UI
```

**Example:**
```typescript
// src/app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { startInteraction } from '@/lib/gemini/interactions'

export async function POST() {
  const interaction = await startInteraction({
    agent: 'deep-research-pro-preview-12-2025',
    input: buildPrompt(),
    background: true  // CRITICAL: Required for async execution
  })

  return NextResponse.json({
    id: interaction.id,
    status: 'started'
  })
}
```

```typescript
// src/app/api/generate/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const interaction = await getInteraction(id)

  if (interaction.status === 'completed') {
    // Parse and save report to Supabase
    const report = await parseAndSaveReport(interaction)
    return NextResponse.json({ status: 'completed', report })
  }

  if (['failed', 'cancelled'].includes(interaction.status)) {
    return NextResponse.json({ status: 'failed' }, { status: 500 })
  }

  return NextResponse.json({ status: 'in_progress' })
}
```

### Pattern 3: Server Actions for Mutations

Use Server Actions for data mutations that originate from user interaction (delete report, update status). Keep them small and focused.

**When to use:** Admin actions like delete, update status

**Example:**
```typescript
// src/actions/reports.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export async function deleteReport(id: string) {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/admin')
  revalidatePath('/archive')
}
```

### Pattern 4: Cron via Vercel Cron Jobs

Vercel Cron Jobs trigger HTTP GET requests to API routes. The cron endpoint must be lightweight (return quickly) and offload the actual work to the async generation flow.

**Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Important:** Timezone is always UTC. `0 6 * * *` = 6:00 AM UTC daily.

**Example:**
```typescript
// src/app/api/cron/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { startGeneration } from '@/lib/gemini/interactions'

export async function GET() {
  // Verify cron secret for security
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Start generation asynchronously
  // The cron job returns immediately; polling happens separately
  await startGeneration()

  return NextResponse.json({ status: 'generation_started' })
}
```

**Note:** Vercel cron jobs have execution time limits (10s on Hobby, 60s on Pro). The cron endpoint must return quickly and let the async flow handle the long-running task.

## Data Flow Diagrams

### Flow 1: Public Page Render

```
                    PUBLIC PAGE RENDER

    Browser                  Server                   Supabase
       |                        |                         |
       |------- Request ------->|                         |
       |    GET /report/xyz     |                         |
       |                        |                         |
       |                        |------ Query ----------->|
       |                        |  SELECT * FROM reports  |
       |                        |  WHERE slug = 'xyz'     |
       |                        |                         |
       |                        |<----- Report Data ------|
       |                        |                         |
       |                        | Render Server Component |
       |                        | (with markdown content) |
       |                        |                         |
       |<------ Full HTML ------|                         |
       |  (SEO-ready, styled)   |                         |
```

### Flow 2: Admin Triggers Generation

```
                    ADMIN GENERATION FLOW

    Admin UI             Next.js API           Gemini API         Supabase
       |                      |                     |                  |
       |-- Click Generate --->|                     |                  |
       |                      |                     |                  |
       |                      |-- Start Interaction -->                |
       |                      |   (background=true)  |                 |
       |                      |                      |                 |
       |                      |<-- Interaction ID ---|                 |
       |                      |                      |                 |
       |<-- ID + "started" ---|                      |                 |
       |                      |                      |                 |
       |                      |       (Gemini researches for 5-15 min) |
       |                      |                      |                 |
       |-- Poll Status ------>|                      |                 |
       |  GET /generate/[id]  |                      |                 |
       |                      |-- Get Interaction -->|                 |
       |                      |                      |                 |
       |                      |<-- in_progress ------|                 |
       |<-- in_progress ------|                      |                 |
       |                      |                      |                 |
       |   ... (repeat every 10-15 seconds) ...      |                 |
       |                      |                      |                 |
       |-- Poll Status ------>|                      |                 |
       |                      |-- Get Interaction -->|                 |
       |                      |                      |                 |
       |                      |<-- completed --------|                 |
       |                      |   (with content)     |                 |
       |                      |                      |                 |
       |                      |-- Parse Report ----------------->      |
       |                      |                                  |     |
       |                      |                                  |     |
       |                      |-- Insert Report ----------------->     |
       |                      |                                        |
       |                      |<-- Success ----------------------------|
       |                      |                                        |
       |<-- completed + report|                                        |
       |                      |                                        |
       | (Update UI, show report)                                      |
```

### Flow 3: Automated Cron Generation

```
                    CRON GENERATION FLOW

  Vercel Cron          Next.js API           Gemini API         Supabase
       |                    |                     |                  |
       |-- GET /api/cron -->|                     |                  |
       | (6AM UTC daily)    |                     |                  |
       |                    |                     |                  |
       |                    |-- Check last run ------------------>   |
       |                    |                                   |    |
       |                    |<-- Last report date --------------|    |
       |                    |                                        |
       |                    | (Skip if already generated today)      |
       |                    |                                        |
       |                    |-- Start Interaction -->                |
       |                    |   (background=true)  |                 |
       |                    |                      |                 |
       |                    |<-- Interaction ID ---|                 |
       |                    |                      |                 |
       |                    |-- Store ID in DB ------------------->  |
       |                    |   (pending_generations table)     |    |
       |                    |                                        |
       |<-- 200 OK ---------|                                        |
       |                    |                                        |
       |                    |                                        |
       |                    |       (Gemini researches async)        |
       |                    |                                        |
       |                    |                                        |
  (Separate polling job or webhook completes the flow)               |
```

**Note:** For cron-triggered generation, you need a mechanism to complete the async flow:
1. **Option A:** Store interaction ID, use a second cron job (every 5 min) to poll pending generations
2. **Option B:** Use Supabase Edge Functions with pg_cron for polling
3. **Option C:** Implement webhook callback (if Gemini supports it)

**Recommended:** Option A (simplest with Vercel free tier)

## Integration Points

### Gemini Interactions API

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/interactions`

**Key parameters:**
- `agent`: `"deep-research-pro-preview-12-2025"` (Deep Research agent)
- `background`: `true` (REQUIRED for async execution)
- `input`: The research prompt

**Status values:**
- `completed` - Results available in `outputs` array
- `in_progress` - Still researching
- `requires_action` - Agent needs input (shouldn't happen with Deep Research)
- `failed` - Task failed
- `cancelled` - Task was cancelled

**Polling best practices:**
- Poll every 10-15 seconds (balances latency vs quota)
- Set maximum poll attempts (60 = ~10-15 min timeout)
- Handle zombie tasks (stuck > 20 min)

**Client implementation:**
```typescript
// src/lib/gemini/interactions.ts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export async function createInteraction(input: string) {
  const response = await fetch(`${BASE_URL}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      input,
      agent: 'deep-research-pro-preview-12-2025',
      background: true
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  return response.json()
}

export async function getInteraction(id: string) {
  const response = await fetch(`${BASE_URL}/interactions/${id}`, {
    headers: {
      'x-goog-api-key': GEMINI_API_KEY
    }
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  return response.json()
}
```

### Supabase Integration

**Tables:**
```sql
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,  -- Markdown content
  summary TEXT,
  category TEXT NOT NULL,
  regions TEXT[],
  sources JSONB,  -- [{url, title}]
  reading_time INTEGER,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  publish_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Track pending generations
CREATE TABLE pending_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);
```

**Row Level Security:**
```sql
-- Public can read published reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published reports"
  ON reports FOR SELECT
  USING (status = 'published');

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access"
  ON reports FOR ALL
  USING (auth.role() = 'service_role');
```

### Markdown Rendering

For rendering 3,500+ word reports with tables, citations, and code blocks, use `react-markdown` with plugins:

```typescript
// src/components/report/report-content.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'  // GitHub Flavored Markdown (tables)
import rehypeHighlight from 'rehype-highlight'  // Code syntax highlighting

interface ReportContentProps {
  content: string
}

export function ReportContent({ content }: ReportContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Custom component overrides for styling
        h1: ({ children }) => (
          <h1 className="text-3xl font-serif font-bold mt-8 mb-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-serif font-bold mt-6 mb-3">{children}</h2>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse border border-gold/20">
              {children}
            </table>
          </div>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-gold hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Gemini Calls

**What:** Calling Gemini Interactions API without `background=true` and waiting for response

**Why bad:**
- Gemini Deep Research takes 5-15 minutes
- HTTP connections timeout (Vercel: 10-60s depending on plan)
- Request will fail every time

**Instead:** Always use `background=true` and implement polling

### Anti-Pattern 2: Client-Side Data Fetching for SEO Content

**What:** Using `useEffect` to fetch report content on client

**Why bad:**
- Search engines won't see content
- Loading spinner on initial page load
- Extra network request after page load

**Instead:** Use Server Components for all public page data fetching

### Anti-Pattern 3: Polling from Cron Endpoint

**What:** Having the cron API route poll Gemini until completion

**Why bad:**
- Cron endpoints have time limits (10s Hobby, 60s Pro)
- Ties up serverless function for 5-15 minutes
- Will fail due to timeout

**Instead:** Cron starts generation, separate mechanism completes it

### Anti-Pattern 4: Storing API Keys in Client Code

**What:** Including `GEMINI_API_KEY` in client-side bundles

**Why bad:**
- Exposed to all users
- Can be extracted from browser DevTools
- Quota/billing abuse

**Instead:** All Gemini calls must be from API routes or Server Actions

## Scalability Considerations

| Concern | At MVP (1 report/day) | At 100 reports | At 1000+ reports |
|---------|----------------------|----------------|------------------|
| Database queries | Single queries sufficient | Add indexes on slug, category, publish_date | Consider pagination, search index |
| Archive page | Load all reports | Paginate (20/page) | Full-text search, infinite scroll |
| Image storage | None initially | Supabase Storage free tier | CDN, image optimization |
| Cron reliability | Vercel Cron free tier | Same | Consider redundant triggers |
| Report generation | 1/day within free tier | Approaches quota limits | Need paid Gemini tier |

## Build Order Dependencies

Based on component dependencies:

```
Phase 1: Foundation (Database + Public UI)
├── Supabase setup (tables, RLS)
├── Basic Next.js structure
├── Report components (card, content, metadata)
├── Public pages (home, archive, report detail)
└── Markdown rendering

Phase 2: Generation Engine
├── Gemini client library
├── API routes (generate, poll)
└── Admin page (dashboard, trigger)

Phase 3: Automation
├── Vercel cron configuration
├── Cron API endpoint
└── Pending generation tracking

Phase 4: Polish
├── SEO optimization
├── Error handling
└── Loading states
```

**Rationale:**
1. Public pages first - they're simpler, establish patterns, and can use seed data
2. Generation engine second - the complex async flow
3. Automation third - builds on working generation
4. Polish last - refinements once core works

## Sources

### Official Documentation (HIGH confidence)
- [Next.js App Router Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js MDX Guide](https://nextjs.org/docs/app/guides/mdx)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions)
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture)

### Best Practices (MEDIUM confidence)
- [Next.js 14 Project Structure Best Practices](https://nextjsstarter.com/blog/nextjs-14-project-structure-best-practices/)
- [Asynchronous Request-Reply Pattern](https://dev.to/willvelida/the-asynchronous-request-reply-pattern-16ki)
- [MakerKit Architecture Guide](https://makerkit.dev/docs/next-supabase/architecture)

### Pattern References (MEDIUM confidence)
- [Google Developers Blog - Building Agents with Interactions API](https://developers.googleblog.com/building-agents-with-the-adk-and-the-new-interactions-api/)
- [The Future of AI Applications is Async](https://medium.com/@sorgina.13_93201/the-future-of-ai-applications-is-async-ebf2be777704)
- [Hookdeck - Asynchronous AI](https://hookdeck.com/blog/asynchronous-ai)
