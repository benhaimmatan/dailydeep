# Phase 3: Automation - Research

**Researched:** 2026-01-26
**Domain:** Vercel Cron Jobs, Scheduled Task Automation, Idempotency
**Confidence:** HIGH (verified with official Vercel documentation)

## Summary

Phase 3 implements automated daily report generation at 6AM UTC via Vercel cron jobs. The existing generation infrastructure (Phase 2) already handles the actual report creation through the fire-and-forget async pattern; this phase adds the scheduled trigger, security validation, and duplicate prevention.

The Vercel cron job system is straightforward: define schedules in `vercel.json`, Vercel invokes the endpoint at the specified time with an `Authorization: Bearer <CRON_SECRET>` header. The endpoint validates this header, checks for duplicates (any report from today or any job in 'generating' status), then triggers the existing generation flow.

The key architectural decision is whether to store cron logs in the database vs Vercel's built-in logging. Given the 30-day retention requirement and the need to display run history in the dashboard, database storage (a new `cron_runs` table) provides better queryability and dashboard integration. Vercel's runtime logs can be used for debugging but don't provide structured data for dashboard display.

**Primary recommendation:** Create a dedicated `/api/cron/generate` endpoint secured with CRON_SECRET, implement idempotency via date-based report lookups and job status checks, store run history in a new `cron_runs` table for dashboard visibility, and add a retry button for failed generations that bypasses the duplicate check.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel Cron | N/A | Scheduled job execution | Native Vercel feature, no additional dependencies |
| Next.js Route Handlers | 14.x | API endpoints | Already in use, App Router pattern |
| Supabase | 2.x | Database for run history | Already in use for all data storage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SWR | 2.3.x | Dashboard polling for cron status | Already installed, use for real-time updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron | QStash by Upstash | More reliable retries, but adds dependency and cost |
| Database logging | Vercel runtime logs only | Simpler, but no dashboard integration |
| Date-based idempotency | Idempotency keys | Keys more flexible but overkill for daily runs |

**Installation:**
```bash
# No new packages required
# All dependencies already installed in Phase 2
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── cron/
│           └── generate/
│               └── route.ts    # Cron endpoint (NEW)
├── lib/
│   └── cron/
│       └── utils.ts            # Cron helper functions (NEW)
└── types/
    └── database.ts             # Add CronRun type
supabase/
└── migrations/
    └── 003_cron_runs.sql       # Cron run history table (NEW)
vercel.json                     # Cron job configuration (NEW)
```

### Pattern 1: Vercel Cron Configuration
**What:** Define scheduled jobs in vercel.json
**When to use:** Any scheduled task on Vercel
**Example:**
```json
// Source: https://vercel.com/docs/cron-jobs/quickstart
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/generate",
      "schedule": "0 6 * * 1-5"
    }
  ]
}
```
Note: `0 6 * * 1-5` means 6:00 AM UTC, Monday through Friday only.

### Pattern 2: CRON_SECRET Validation
**What:** Verify the request came from Vercel's cron system
**When to use:** Every cron endpoint
**Example:**
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Proceed with cron logic
}
```

### Pattern 3: Date-Based Idempotency Check
**What:** Prevent duplicate reports for the same day
**When to use:** Before triggering generation
**Example:**
```typescript
// Check if report already exists for today
async function hasReportForToday(supabase: SupabaseClient): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .gte('published_at', today.toISOString())
    .lt('published_at', tomorrow.toISOString());

  return (count ?? 0) > 0;
}

// Check if generation is in progress
async function hasInProgressJob(supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase
    .from('generation_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'generating');

  return (count ?? 0) > 0;
}
```

### Pattern 4: Cron Run Logging
**What:** Store run history for dashboard visibility
**When to use:** After each cron execution
**Example:**
```typescript
interface CronRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'success' | 'skipped' | 'failed';
  topic: string | null;
  category_name: string | null;
  report_id: string | null;
  error: string | null;
  skip_reason: string | null;
}

// Log cron run
async function logCronRun(
  supabase: SupabaseClient,
  data: Partial<CronRun>
): Promise<void> {
  await supabase.from('cron_runs').insert(data);
}
```

### Pattern 5: Stuck Job Detection
**What:** Handle jobs stuck in 'generating' status
**When to use:** Before starting new generation, during cron execution
**Example:**
```typescript
// Consider a job stuck if generating for more than 30 minutes
async function cleanupStuckJobs(supabase: SupabaseClient): Promise<void> {
  const thirtyMinutesAgo = new Date();
  thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

  await supabase
    .from('generation_jobs')
    .update({
      status: 'failed',
      error: 'Job timed out (stuck for >30 minutes)',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'generating')
    .lt('started_at', thirtyMinutesAgo.toISOString());
}
```

### Anti-Patterns to Avoid
- **Storing CRON_SECRET in client code:** Environment variable only, never expose
- **Using POST for cron endpoints:** Vercel cron uses GET requests only
- **Skipping authorization check:** Always validate CRON_SECRET header
- **Relying on cron for retries:** Vercel doesn't retry failed cron jobs; handle failures in application
- **Not logging cron runs:** Makes debugging difficult; always log start, end, and status

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom scheduler | Vercel Cron | Free, reliable, no infrastructure to manage |
| Secret validation | Custom auth | CRON_SECRET pattern | Vercel auto-injects, battle-tested |
| Duplicate prevention | Complex locking | Date-based DB query | Simple, reliable, matches daily cadence |
| Run history | File-based logs | Database table | Queryable, dashboard integration |

**Key insight:** Vercel cron is just an HTTP GET request with a secret header. The complexity is in idempotency and logging, not in the scheduling itself.

## Common Pitfalls

### Pitfall 1: Cron Jobs Only Run in Production
**What goes wrong:** Cron jobs don't trigger locally or on preview deployments
**Why it happens:** Vercel only executes crons on production deployments
**How to avoid:** Test cron endpoints manually with curl, include Authorization header
**Warning signs:** "Works on local" but cron never fires in production

### Pitfall 2: Missing CRON_SECRET Environment Variable
**What goes wrong:** All cron invocations return 401 Unauthorized
**Why it happens:** CRON_SECRET not set in Vercel dashboard
**How to avoid:** Add CRON_SECRET to Vercel Environment Variables (production)
**Warning signs:** Cron logs show 401 errors

### Pitfall 3: Weekend Execution When Not Wanted
**What goes wrong:** Reports generated on Saturday/Sunday
**Why it happens:** Using `* * * * *` instead of weekday-specific expression
**How to avoid:** Use `0 6 * * 1-5` for Monday-Friday only
**Warning signs:** Reports appearing on weekends

### Pitfall 4: Duplicate Reports on Rapid Cron Triggers
**What goes wrong:** Multiple reports for the same day
**Why it happens:** Vercel can occasionally trigger cron twice (event-driven system)
**How to avoid:** Always check for existing report with today's date before generating
**Warning signs:** Two reports with same published_at date

### Pitfall 5: Cron Doesn't Follow Redirects
**What goes wrong:** Cron job appears to run but nothing happens
**Why it happens:** If endpoint returns 3xx, cron considers it complete
**How to avoid:** Return 200 or error directly, never redirect
**Warning signs:** Successful cron logs but no generation started

### Pitfall 6: Hobby Plan Cron Timing Imprecision
**What goes wrong:** Job runs at 6:47 instead of 6:00
**Why it happens:** Hobby plan has hourly accuracy only
**How to avoid:** Upgrade to Pro for minute-level accuracy, or accept variance
**Warning signs:** Inconsistent execution times across days

### Pitfall 7: Stuck Jobs Block New Generations
**What goes wrong:** New cron runs skip because a job is "generating" forever
**Why it happens:** Job failed without updating status (process crash)
**How to avoid:** Add timeout detection - mark jobs as failed if generating >30 min
**Warning signs:** Cron logs show "skipped - job in progress" but dashboard shows no progress

## Code Examples

Verified patterns from official sources:

### Complete Cron Endpoint
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs
// src/app/api/cron/generate/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDailyTrends } from '@/lib/trends/client';

export async function GET(request: NextRequest) {
  const startedAt = new Date().toISOString();
  const supabase = await createClient();

  // 1. Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Check for weekend (skip Saturday=6, Sunday=0)
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'skipped',
      skip_reason: 'Weekend - no generation scheduled',
    });
    return Response.json({ success: true, message: 'Weekend - skipped' });
  }

  // 3. Check for existing report today
  if (await hasReportForToday(supabase)) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'skipped',
      skip_reason: 'Report already generated today',
    });
    return Response.json({ success: true, message: 'Already generated today' });
  }

  // 4. Check for in-progress job (with stuck job cleanup)
  await cleanupStuckJobs(supabase);
  if (await hasInProgressJob(supabase)) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'skipped',
      skip_reason: 'Generation already in progress',
    });
    return Response.json({ success: true, message: 'Generation in progress' });
  }

  // 5. Get today's category and trending topic
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('day_of_week', dayOfWeek)
    .single();

  const trends = await getDailyTrends();
  const topic = trends[0]?.title || 'Breaking News Today';

  // 6. Trigger generation (existing endpoint logic)
  // ... call existing generation logic

  return Response.json({ success: true, jobId: job.id });
}
```

### vercel.json Configuration
```json
// Source: https://vercel.com/docs/cron-jobs/quickstart
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/generate",
      "schedule": "0 6 * * 1-5"
    }
  ]
}
```

### Cron Run History Migration
```sql
-- supabase/migrations/003_cron_runs.sql
CREATE TABLE cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'failed')),
  topic TEXT,
  category_name TEXT,
  report_id UUID REFERENCES reports(id),
  error TEXT,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent runs query
CREATE INDEX idx_cron_runs_started ON cron_runs(started_at DESC);

-- RLS - only authenticated can read
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cron runs"
  ON cron_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cron runs"
  ON cron_runs FOR INSERT TO authenticated WITH CHECK (true);
```

### Retry Button for Failed Generations
```typescript
// Add to existing reports page or generation page
// Bypasses duplicate check via force parameter
async function retryGeneration(jobId: string) {
  const response = await fetch('/api/admin/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: failedJob.topic,
      categoryId: failedJob.category_id,
      force: true, // Bypass duplicate check
    }),
  });
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External cron services (EasyCron, cron-job.org) | Vercel native cron | 2023 | No external dependency, built into platform |
| Webhook-based triggers | Direct cron invocation | 2023 | Simpler setup, no external service needed |
| Complex distributed locks | Date-based idempotency | N/A | Sufficient for daily cadence, simpler |

**Deprecated/outdated:**
- External cron services: Unnecessary with Vercel cron
- Complex retry logic: Vercel doesn't retry, handle in app if needed

## Open Questions

Things that couldn't be fully resolved:

1. **Hobby Plan Cron Timing Precision**
   - What we know: Hobby plan has hourly accuracy, Pro has minute accuracy
   - What's unclear: Whether 6AM could trigger at 6:59 on Hobby
   - Recommendation: Accept variance for Hobby, or use Pro plan

2. **Vercel Cron Reliability Under Load**
   - What we know: Vercel uses event-driven system, can occasionally duplicate
   - What's unclear: Exact frequency of duplicate triggers
   - Recommendation: Idempotency check handles this; monitor in production

3. **Long-Running Job Impact on Cron**
   - What we know: Generation takes 5-15 minutes, cron triggers at fixed time
   - What's unclear: Whether Vercel waits for response or times out
   - Recommendation: Return 200 immediately after starting generation (existing fire-and-forget pattern)

## Sources

### Primary (HIGH confidence)
- [Vercel Cron Jobs Quickstart](https://vercel.com/docs/cron-jobs/quickstart) - configuration format, schedule syntax
- [Vercel Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) - CRON_SECRET security, error handling, concurrency
- [Crontab.guru - Weekdays Only](https://crontab.guru/weekdays-only) - verified cron expression `0 6 * * 1-5`

### Secondary (MEDIUM confidence)
- [Vercel Troubleshooting Cron Jobs](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs) - common issues
- [CodingCat - Secure Vercel Cron Jobs](https://codingcat.dev/post/how-to-secure-vercel-cron-job-routes-in-next-js-14-app-router) - implementation patterns

### Tertiary (LOW confidence)
- Community discussions on cron reliability - anecdotal, monitor in production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - native Vercel feature with official documentation
- Architecture: HIGH - straightforward HTTP endpoint with header validation
- Pitfalls: MEDIUM - based on docs and community reports, some edge cases theoretical

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (Vercel cron is stable feature, unlikely to change)
