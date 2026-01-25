# Phase 2: Generation Engine - Research

**Researched:** 2026-01-25
**Domain:** AI Report Generation, Admin Authentication, Async Job Processing
**Confidence:** MEDIUM (verified with official docs but some API limits unclear)

## Summary

Phase 2 requires integrating four major systems: Supabase Auth for admin authentication, the Google Gemini API for report generation, Google Trends API for topic discovery, and a robust async polling architecture for the 5-15 minute generation process.

The key architectural challenge is the long-running generation time. Vercel's serverless functions have timeout limits (5 minutes on Hobby, up to 13 minutes on Pro with Fluid Compute). The recommended pattern is: trigger generation via an API route that starts the job and returns immediately, store job status in Supabase, poll for completion via a separate status endpoint. Streaming the Gemini response does NOT solve the timeout problem as the issue is Vercel function execution time, not HTTP response time.

For admin auth, Supabase SSR with `@supabase/ssr` is the established pattern for Next.js 14 App Router. Use `supabase.auth.getUser()` (NOT `getSession()`) in server code to validate authentication. The existing middleware already refreshes tokens; it needs extension to check for admin role on protected routes.

**Primary recommendation:** Use a three-phase generation architecture: (1) API route starts generation and stores job ID in Supabase, (2) background processing generates report with Gemini, (3) client polls status endpoint until complete. Use streaming with Gemini to handle the response, but do NOT rely on streaming to bypass timeouts.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | ^0.8.0 | Server-side auth for Next.js | Official Supabase recommendation, already installed |
| @google/genai | ^1.37.0 | Gemini API SDK for Node.js | Official Google SDK, replaces legacy @google/generative-ai |
| google-trends-api | ^4.9.2 | Google Trends data access | Most mature Node.js library, 20+ daily trends results |
| zod | ^3.24.0 | Schema validation | Works with Gemini structured output, type-safe |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| swr | ^2.3.0 | Client-side polling | Dashboard status updates, refreshInterval for polling |
| zod-to-json-schema | ^3.24.0 | Convert Zod to JSON Schema | Gemini structured output configuration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client polling | Supabase Realtime | Simpler setup with polling, Realtime adds complexity |
| google-trends-api | g-trends | google-trends-api has better documentation and dailyTrends support |
| @google/genai | @google/generative-ai | Legacy package, genai is the official recommended SDK |

**Installation:**
```bash
npm install @google/genai google-trends-api zod zod-to-json-schema swr
npm install -D @types/google-trends-api
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx         # Admin layout with auth check
│   │   ├── page.tsx           # Dashboard (stats, today's category)
│   │   ├── login/
│   │   │   └── page.tsx       # Login form
│   │   └── reports/
│   │       └── page.tsx       # Report list with management
│   └── api/
│       ├── auth/
│       │   └── callback/route.ts  # Auth callback handler
│       ├── admin/
│       │   ├── generate/route.ts   # Start generation job
│       │   ├── status/[jobId]/route.ts  # Poll job status
│       │   └── reports/route.ts    # CRUD operations
│       └── trends/route.ts     # Get trending topics
├── lib/
│   ├── supabase/              # Existing - client.ts, server.ts
│   ├── gemini/
│   │   ├── client.ts          # Gemini SDK initialization
│   │   ├── prompts.ts         # Report generation prompts
│   │   └── schemas.ts         # Zod schemas for structured output
│   ├── trends/
│   │   └── client.ts          # Google Trends wrapper
│   └── admin/
│       └── auth.ts            # Admin auth utilities
└── types/
    └── database.ts            # Existing - add generation_jobs table type
```

### Pattern 1: Async Job with Database Status
**What:** Start a background job, store status in database, poll for completion
**When to use:** Long-running operations (5-15 minutes) that exceed serverless timeouts
**Example:**
```typescript
// Source: Vercel Durable Functions pattern
// POST /api/admin/generate/route.ts
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topic } = await request.json();

  // Create job record
  const { data: job } = await supabase
    .from('generation_jobs')
    .insert({
      topic,
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Start generation in background (see Pattern 2)
  generateReportAsync(job.id, topic);

  return Response.json({ jobId: job.id });
}
```

### Pattern 2: Streaming Gemini Response with Progress Updates
**What:** Use generateContentStream to receive chunks, update database with progress
**When to use:** Long generation that needs progress feedback
**Example:**
```typescript
// Source: @google/genai SDK + Vercel Fluid Compute pattern
async function generateReportAsync(jobId: string, topic: string) {
  const supabase = await createClient();

  try {
    await supabase.from('generation_jobs')
      .update({ status: 'generating', progress: 'Starting AI generation...' })
      .eq('id', jobId);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: buildPrompt(topic),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: reportSchema,
      },
    });

    let fullContent = '';
    for await (const chunk of response) {
      fullContent += chunk.text;
      await supabase.from('generation_jobs')
        .update({ progress: `Generated ${fullContent.length} characters...` })
        .eq('id', jobId);
    }

    // Validate and save
    const report = JSON.parse(fullContent);
    if (report.content.split(' ').length < 3000) {
      throw new Error('Report too short');
    }

    await supabase.from('generation_jobs')
      .update({ status: 'completed', report_id: savedReport.id })
      .eq('id', jobId);

  } catch (error) {
    await supabase.from('generation_jobs')
      .update({ status: 'failed', error: error.message })
      .eq('id', jobId);
  }
}
```

### Pattern 3: Client Polling with SWR
**What:** Poll status endpoint at regular intervals
**When to use:** Dashboard showing generation progress
**Example:**
```typescript
// Source: SWR documentation + common patterns
'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function GenerationStatus({ jobId }: { jobId: string }) {
  const { data, error } = useSWR(
    jobId ? `/api/admin/status/${jobId}` : null,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds
      // Stop polling when complete
      isPaused: () => data?.status === 'completed' || data?.status === 'failed',
    }
  );

  if (data?.status === 'generating') {
    return <div>{data.progress}</div>;
  }
  // ...
}
```

### Pattern 4: Admin Route Protection
**What:** Check admin email against environment variable
**When to use:** All admin routes and API endpoints
**Example:**
```typescript
// Source: Supabase Auth docs - always use getUser() in server code
// lib/admin/auth.ts
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/admin/login');
  }

  if (user.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login');
  }

  return user;
}

// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  await requireAdmin();
  return <>{children}</>;
}
```

### Anti-Patterns to Avoid
- **Using getSession() in server code:** Not validated, can be spoofed. Always use `getUser()`
- **Waiting for Gemini in API response:** Causes timeouts. Start job, return immediately, poll for status
- **Storing API keys in client code:** Gemini API key must only be used server-side
- **Hardcoding admin check in middleware:** Keep middleware light, do full auth check in route/layout

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT handling | Supabase Auth | Session management, token refresh, security edge cases |
| JSON validation | Manual parsing/checking | Zod + Gemini structured output | Type safety, runtime validation, error messages |
| Polling logic | setInterval + useState | SWR refreshInterval | Handles cleanup, pausing, error states, caching |
| Trending topics | Web scraping | google-trends-api | Rate limiting handled, stable API, 15-day history |
| Markdown rendering | Custom parser | react-markdown (already installed) | Edge cases, security, GFM support |

**Key insight:** The 5-15 minute generation time makes async job patterns essential. Attempting synchronous generation will fail on any serverless platform.

## Common Pitfalls

### Pitfall 1: Vercel Function Timeouts
**What goes wrong:** Generation takes 5-15 minutes, Vercel times out at 5 minutes (Hobby) or 13 minutes (Pro)
**Why it happens:** Serverless functions have execution time limits
**How to avoid:** Use async job pattern - start job, return immediately, poll for completion
**Warning signs:** 504 Gateway Timeout errors after ~60-120 seconds

### Pitfall 2: Using getSession() Instead of getUser()
**What goes wrong:** Security vulnerability - session data from cookies isn't validated
**Why it happens:** `getSession()` reads from cookies without server verification
**How to avoid:** Always use `supabase.auth.getUser()` which validates against Supabase server
**Warning signs:** Auth works locally but has security issues in production

### Pitfall 3: Gemini API Token/Time Limits
**What goes wrong:** Very long prompts (100K+ tokens) can take 10+ minutes, causing timeouts
**Why it happens:** Gemini processing time scales with input/output size
**How to avoid:** Keep prompts focused, use streaming, set reasonable output limits
**Warning signs:** Requests timing out after several minutes

### Pitfall 4: Google Trends Rate Limiting
**What goes wrong:** Too many requests cause blocks from Google
**Why it happens:** No official API, library scrapes Google Trends website
**How to avoid:** Cache results, limit to 1 request per topic discovery, add delays if needed
**Warning signs:** Empty responses or errors after multiple rapid requests

### Pitfall 5: Progress State Not Updating in UI
**What goes wrong:** Database updates happen but UI doesn't reflect changes
**Why it happens:** SWR caching or missing revalidation
**How to avoid:** Use `refreshInterval` for polling, ensure status endpoint returns latest data
**Warning signs:** Status stuck on "generating" even after completion

### Pitfall 6: Auth Callback Not Configured
**What goes wrong:** After login, user sees error or infinite redirect
**Why it happens:** Missing `/api/auth/callback` route handler for Supabase
**How to avoid:** Create callback route that exchanges code for session
**Warning signs:** Login form submits but auth never completes

## Code Examples

Verified patterns from official sources:

### Gemini Structured Output with Zod
```typescript
// Source: https://ai.google.dev/gemini-api/docs/structured-output
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const ReportSchema = z.object({
  title: z.string().describe('Compelling headline for the report'),
  subtitle: z.string().describe('Supporting subheadline'),
  summary: z.string().describe('2-3 sentence summary'),
  content: z.string().describe('Full markdown report, 3000+ words'),
  sources: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
  })).describe('At least 5 credible sources'),
  seo_title: z.string().max(60),
  seo_description: z.string().max(160),
  seo_keywords: z.array(z.string()),
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Write an investigative report about: ${topic}`,
  config: {
    responseMimeType: 'application/json',
    responseJsonSchema: zodToJsonSchema(ReportSchema),
  },
});

const report = ReportSchema.parse(JSON.parse(response.text));
```

### Supabase Login with Email/Password
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// app/admin/login/page.tsx
'use client';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });

    if (error) {
      // Show "Invalid credentials" - don't reveal which field is wrong
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Google Trends Daily Topics
```typescript
// Source: https://github.com/pat310/google-trends-api
import googleTrends from 'google-trends-api';

interface TrendingTopic {
  title: string;
  traffic: string;
  relatedQueries: string[];
}

export async function getDailyTrends(geo = 'US'): Promise<TrendingTopic[]> {
  const results = await googleTrends.dailyTrends({ geo });
  const data = JSON.parse(results);

  const trends = data.default.trendingSearchesDays[0].trendingSearches;

  return trends.slice(0, 10).map((trend: any) => ({
    title: trend.title.query,
    traffic: trend.formattedTraffic,
    relatedQueries: trend.relatedQueries.map((q: any) => q.query),
  }));
}
```

### Protected Admin Layout
```typescript
// Source: Supabase SSR docs
// app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/admin/login');
  }

  // Check against allowed admin email
  if (user.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <nav>{/* Admin nav */}</nav>
      <main>{children}</main>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @google/generative-ai | @google/genai | 2025 | New official SDK with better TypeScript support |
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | Unified SSR package for all frameworks |
| getSession() in server | getUser() in server | 2024 | Security fix - getUser validates token |
| Vercel 10s timeout | Fluid Compute 5-13 min | 2025 | Enables longer serverless functions |
| gemini-1.5-* models | gemini-2.5-flash | 2025 | Current recommended model |
| Manual JSON parsing | Gemini structured output with Zod | 2025 | Guaranteed valid JSON output |

**Deprecated/outdated:**
- `@google/generative-ai`: Legacy SDK, migrate to `@google/genai`
- `gemini-2.0-*` models: Retiring March 2026, use gemini-2.5-flash or newer
- `supabase.auth.getSession()` in server code: Security risk, use `getUser()`

## Open Questions

Things that couldn't be fully resolved:

1. **Vercel Hobby vs Pro for 5-15 min generation**
   - What we know: Hobby has 5 min max, Pro has 13 min with Fluid Compute
   - What's unclear: Whether 13 minutes is sufficient for worst-case generation
   - Recommendation: Start with Pro plan assumption, monitor generation times

2. **Google Trends API reliability/rate limits**
   - What we know: Unofficial API, subject to changes, rate limiting exists
   - What's unclear: Exact rate limits, reliability for production use
   - Recommendation: Cache aggressively, have fallback (manual topic entry)

3. **Gemini API pricing at scale**
   - What we know: User noted free tier insufficient (5 reports/month)
   - What's unclear: Exact costs for 3000+ word reports with sources
   - Recommendation: Start with Gemini 2.5 Flash (cheaper), monitor usage

4. **Background job execution pattern**
   - What we know: Can't do true background jobs on Vercel Hobby
   - What's unclear: Whether streaming response + database updates work within timeout
   - Recommendation: Use Vercel Pro with Fluid Compute, or consider Vercel Durable Functions

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - auth patterns, getUser vs getSession
- [Google Gemini API Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) - JSON output with Zod
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) - latest SDK version 1.37.0
- [Vercel Function Duration](https://vercel.com/docs/functions/configuring-functions/duration) - timeout limits by plan

### Secondary (MEDIUM confidence)
- [Inngest Blog - Next.js Timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts) - async job patterns verified with Vercel docs
- [Google Trends API GitHub](https://github.com/pat310/google-trends-api) - dailyTrends API
- [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions) - background execution for agents only

### Tertiary (LOW confidence)
- [Gemini Forum - Timeout Issues](https://discuss.ai.google.dev/t/gemini-2-5-flash-api-request-timeouting-after-120-seconds/80305) - community reports, Vercel vs Gemini timeouts unclear

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - official docs verified for all packages
- Architecture: MEDIUM - patterns verified but production timeout behavior needs testing
- Pitfalls: MEDIUM - based on docs + community reports, some edge cases unknown

**Research date:** 2026-01-25
**Valid until:** 2026-02-15 (Gemini API evolving rapidly, verify model versions)
