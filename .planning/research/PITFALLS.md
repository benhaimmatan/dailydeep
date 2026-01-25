# Domain Pitfalls: AI-Powered Intelligence Publishing Platform

**Domain:** AI content generation, async processing, premium publishing
**Date:** 2026-01-25
**Confidence:** HIGH (verified against official docs, community reports, and recent incidents)

---

## Critical Pitfalls

Mistakes that cause rewrites, production outages, or product failure.

### P1: Gemini API Quota Exhaustion on December 2025 Changes

**What goes wrong:** Production application suddenly starts returning 429 errors. Daily report generation fails silently. Users see no content.

**Why it happens:** Google dramatically changed Gemini API quotas on December 7, 2025. Free tier dropped from 250+ requests/day to 20-100 for some models. Deep Research is limited to 5 reports/month on free tier and forces the "Fast" model instead of Pro.

**Consequences:**
- Daily cron fails with 429 errors
- No fallback means zero content for the day
- Silent model downgrade to Flash produces lower-quality outputs

**Prevention:**
1. Use a paid tier (Gemini Advanced at $20/month minimum for quality Deep Research)
2. Implement explicit quota monitoring before each generation
3. Build a fallback chain: Primary model -> Secondary model -> Cached/placeholder content
4. Store quota usage metrics in Supabase to track consumption

**Warning signs:**
- Intermittent 429 errors in logs
- Sudden drop in content quality (silent Flash downgrade)
- Generation times becoming inconsistent

**Detection:** Monitor response headers for rate limit info; log model names from responses to catch downgrades.

**Phase to address:** Phase 1 (MVP) - Core infrastructure must handle this from day one.

**Sources:**
- [Gemini API Pricing and Quotas Guide](https://www.aifreeapi.com/en/posts/gemini-api-pricing-and-quotas)
- [Gemini Deep Research Limits](https://www.oreateai.com/blog/understanding-geminis-deep-research-limits-a-guide-for-users/d9dd004b88feb38605d518cc9f82e66c)

---

### P2: Vercel Cron Timeout Causes Generation Failure

**What goes wrong:** The 6 AM UTC cron triggers, initiates Gemini Deep Research, but the serverless function times out before receiving the result. Generation is lost.

**Why it happens:** Vercel serverless functions have strict timeout limits:
- Hobby plan: 10s default, 60s max
- Pro plan: 60s default, 300s max
- Gemini Deep Research takes 5-15 minutes

The function cannot wait for Deep Research to complete synchronously.

**Consequences:**
- Daily report never generates
- No retry mechanism means missed days
- Cron appears successful but no content appears

**Prevention:**
1. **Never synchronously wait** for Deep Research completion in the cron handler
2. Use the Interactions API async pattern:
   - Cron triggers initiation -> immediately returns 200
   - Store interaction ID in Supabase with "pending" status
   - Use separate polling mechanism or webhook to check completion
3. Implement `waitUntil()` for background task continuation
4. Consider Upstash Workflow or Inngest for durable function orchestration

**Warning signs:**
- Cron logs show 504 FUNCTION_INVOCATION_TIMEOUT
- Reports table has "pending" entries that never complete
- Successful cron executions but no content

**Detection:** Track time between cron start and report completion. Alert if > 20 minutes without resolution.

**Phase to address:** Phase 1 (MVP) - This is architecturally fundamental.

**Sources:**
- [Vercel Cron Jobs Timeout Discussion](https://github.com/vercel/community/discussions/3302)
- [Troubleshooting Vercel Cron Jobs](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)
- [Solving Vercel's Timeout Limits](https://www.inngest.com/blog/vercel-long-running-background-functions)

---

### P3: Supabase Row Level Security (RLS) Not Enabled

**What goes wrong:** Entire database is publicly readable/writable through the client API. Attackers can read all reports, delete content, or inject malicious data.

**Why it happens:** Supabase disables RLS by default on new tables. Developers forget to enable it, or enable it without creating policies. 83% of exposed Supabase databases involve RLS misconfigurations. In January 2025, 170+ apps built with Lovable were found exposed due to missing RLS (CVE-2025-48757).

**Consequences:**
- Complete data breach
- Data destruction
- Admin impersonation
- Reputation damage

**Prevention:**
1. Enable RLS immediately on every table creation:
   ```sql
   ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
   ```
2. Create explicit policies for each access pattern
3. Use security definer functions for admin checks (not raw JWT claims)
4. Never use `user_metadata` in RLS policies (user-modifiable)
5. Test with non-admin accounts to verify restrictions

**Warning signs:**
- Tables without RLS enabled in Supabase dashboard
- Policies that use `true` for SELECT (allows anyone to read)
- Missing admin role verification

**Detection:** Audit script that checks `pg_tables` for RLS status; automated tests that attempt unauthorized access.

**Phase to address:** Phase 1 (MVP) - Security is foundational.

**Sources:**
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Complete Guide 2025](https://vibeappscanner.com/supabase-row-level-security)
- [Admin Role RLS Setup](https://dev.to/shahidkhans/setting-up-row-level-security-in-supabase-user-and-admin-2ac1)

---

### P4: No Content Quality Validation Gate

**What goes wrong:** Gemini generates a report with hallucinated citations, factual errors, or truncated content. It gets published automatically. Product credibility destroyed.

**Why it happens:**
- Treating AI output as "done" without validation
- No word count verification (promised 3,500+ words, got 800)
- No citation verification (sources don't exist)
- No structural validation (missing sections, broken formatting)

**Consequences:**
- Published reports with invented facts
- Broken trust with premium subscribers
- SEO damage from low-quality content
- Potential legal issues from false claims

**Prevention:**
1. **Pre-publish validation pipeline:**
   - Word count check (reject if < 3,000 words)
   - Section presence check (intro, body sections, conclusion)
   - Markdown structure validation (tables render, links valid)
   - Basic coherence check (no obvious repetition, truncation)
2. **Human review flag** for borderline cases
3. **Never auto-publish** - always require explicit approval or quality gate pass
4. Store raw + validated versions for debugging

**Warning signs:**
- Reports with wildly varying lengths
- User complaints about accuracy
- Markdown rendering errors on frontend
- Reports that stop mid-sentence

**Detection:** Automated quality metrics dashboard; random human audits; user feedback mechanism.

**Phase to address:** Phase 2 (after basic generation works) - Add validation before going live.

**Sources:**
- [AI Content Quality Control Guide 2026](https://koanthic.com/en/ai-content-quality-control-complete-guide-for-2026-2/)
- [Stop AI Hallucinations Guide 2025](https://infomineo.com/artificial-intelligence/stop-ai-hallucinations-detection-prevention-verification-guide-2025/)

---

## Technical Debt Patterns

Shortcuts that compound into major problems over time.

### T1: Hardcoded Topic Selection

**What goes wrong:** Topics are hardcoded in code. Changing topics requires deployment. Admin can't adjust dynamically.

**Why it matters:** A "quick fix" that becomes permanent. Every topic change needs developer involvement.

**Prevention:**
- Design topic management as a first-class feature from Phase 1
- Store topics in Supabase with active/inactive status
- Build admin UI for topic CRUD early

**Phase to address:** Phase 1 (MVP) - Design for flexibility from start.

---

### T2: No Idempotency in Cron Jobs

**What goes wrong:** Cron fires twice (Vercel issue, network retry, deployment trigger). Two identical reports generated. Duplicate content, wasted API costs.

**Why it happens:** Vercel crons can trigger on deployment. Network issues can cause retries. No deduplication logic.

**Prevention:**
1. Generate idempotency key based on date + topic
2. Check for existing "pending" or "completed" report before starting
3. Use database constraints (unique on date + topic)
4. Implement distributed locking if needed

**Phase to address:** Phase 1 (MVP) - Prevent duplicates from day one.

**Sources:**
- [Crons Jobs running as each deployment](https://github.com/vercel/next.js/discussions/58190)

---

### T3: Mixing Sync and Async Patterns

**What goes wrong:** Some endpoints wait for Gemini (timeout), others use async (work). Inconsistent error handling. Debugging nightmare.

**Why it matters:** Cognitive overhead increases. New developers make wrong assumptions. Bugs multiply.

**Prevention:**
- Establish clear async-first architecture from Phase 1
- Document the pattern: "Initiate -> Store ID -> Poll/Webhook -> Publish"
- All Gemini interactions follow same flow

**Phase to address:** Phase 1 (MVP) - Architecture decision, not feature.

---

## Integration Gotchas

### G1: Gemini Interactions API Preview Instability

**What goes wrong:** API schema changes without warning. Code breaks. Field names change (e.g., `total_reasoning_tokens` -> `total_thought_tokens`).

**Why it happens:** Preview APIs are unstable. Google explicitly warns: "Preview models may be deprecated with at least 2 weeks notice."

**Prevention:**
1. Abstract Gemini calls behind a service layer
2. Version-pin client libraries
3. Monitor Google's [Release Notes](https://ai.google.dev/gemini-api/docs/changelog)
4. Build graceful degradation for schema mismatches
5. Log full API responses for debugging

**Phase to address:** Phase 1 (MVP) - Abstraction layer is foundational.

**Sources:**
- [Gemini API Release Notes](https://ai.google.dev/gemini-api/docs/changelog)
- [Gemini Interactions API Docs](https://ai.google.dev/gemini-api/docs/interactions)

---

### G2: Supabase Edge Function Memory Limits

**What goes wrong:** Processing large Gemini responses (3,500+ words with metadata) causes function to crash with OOM.

**Why it happens:** Edge Functions have strict memory limits. Buffering entire responses into memory, parsing large JSON, or creating many objects without cleanup causes crashes.

**Prevention:**
1. Stream responses where possible
2. Don't buffer entire report in memory during processing
3. Use pagination for large queries
4. Clean up objects in long-running functions
5. Consider using Vercel serverless instead of Supabase Edge for heavy processing

**Phase to address:** Phase 2 - Optimize after basic functionality works.

**Sources:**
- [Supabase Edge Function Shutdown Reasons](https://supabase.com/docs/guides/troubleshooting/edge-function-shutdown-reasons-explained)

---

### G3: Vercel Cron Hobby Plan Timing Imprecision

**What goes wrong:** Cron scheduled for 06:00 UTC fires at 06:47 UTC. Users expecting 6 AM content find nothing.

**Why it happens:** Hobby plan only guarantees hour-level precision, not minute-level. Job scheduled for 15:00 can trigger 15:00-15:59.

**Prevention:**
1. Upgrade to Pro plan for minute-level precision
2. If on Hobby, set cron for 05:00 to ensure completion by 06:00
3. Communicate "morning" not "6 AM" to users
4. Consider external cron service (Schedo.dev, cron-job.org) for precision

**Phase to address:** Phase 1 (MVP) - Set correct expectations from launch.

**Sources:**
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Handling Timezone Issues in Cron Jobs](https://dev.to/cronmonitor/handling-timezone-issues-in-cron-jobs-2025-guide-52ii)

---

### G4: Caching Prevents Cron Execution

**What goes wrong:** Cron appears to run (200 response) but no work happens. Vercel serves cached response instead of executing function.

**Why it happens:** Route handlers can be cached. Without explicit opt-out, Vercel may serve stale response.

**Prevention:**
```typescript
// In your cron route handler
export const dynamic = 'force-dynamic';
```

**Phase to address:** Phase 1 (MVP) - Simple fix, critical impact.

**Sources:**
- [Troubleshooting Vercel Cron Jobs](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)

---

## Performance Traps

### F1: No Database Indexes on Query Columns

**What goes wrong:** Report list page loads slowly. Dashboard queries timeout. Performance degrades as data grows.

**Why it happens:** Tables created without considering query patterns. `WHERE status = 'published'` scans entire table.

**Prevention:**
1. Add indexes on frequently queried columns:
   - `reports.status`
   - `reports.published_at`
   - `reports.topic_id`
2. Use Supabase's query analyzer to identify slow queries
3. Review RLS policies for performance (use security definer functions)

**Phase to address:** Phase 2 - Add indexes as query patterns emerge.

---

### F2: Unbounded Content Fetching

**What goes wrong:** Admin panel loads all reports at once. Browser freezes with 1000+ reports.

**Why it happens:** Initial development with small dataset. No pagination implemented. Works fine with 10 reports, dies with 1000.

**Prevention:**
1. Implement pagination from Phase 1 (even if only 10 items exist)
2. Set default limits on all queries
3. Add cursor-based pagination for large datasets

**Phase to address:** Phase 1 (MVP) - Pagination is not optional.

---

## Security Mistakes

### S1: Exposing Service Role Key

**What goes wrong:** Service role key leaks to frontend. Attacker gains full database access, bypassing all RLS.

**Why it happens:**
- Accidentally importing server code in client components
- Environment variable naming confusion (NEXT_PUBLIC_* vs private)
- Copy-paste errors

**Prevention:**
1. Never prefix service keys with `NEXT_PUBLIC_`
2. Use `anon` key exclusively on client
3. Service key only in API routes and server components
4. Audit bundle with `@next/bundle-analyzer` for leaked secrets

**Phase to address:** Phase 1 (MVP) - Security fundamental.

**Sources:**
- [Supabase Securing Your API](https://supabase.com/docs/guides/api/securing-your-api)

---

### S2: Admin Auth Without Proper Verification

**What goes wrong:** Admin routes check only if user is authenticated, not if they're admin. Any logged-in user accesses admin functions.

**Why it happens:** Simplified auth check: `if (session) { allow }` instead of `if (session && isAdmin(session.user)) { allow }`.

**Prevention:**
1. Create explicit admin verification function
2. Use security definer function in Supabase for admin checks
3. Separate admin routes in distinct route group with middleware
4. Test with non-admin accounts

**Phase to address:** Phase 1 (MVP) - Admin protection is core requirement.

---

### S3: Cron Endpoint Without Authorization

**What goes wrong:** Anyone can trigger the cron endpoint by visiting the URL. Malicious actors spam generation, exhausting API quota.

**Why it happens:** Cron endpoint is just a public route. No verification that Vercel (not a random user) is calling it.

**Prevention:**
```typescript
// Verify Vercel cron secret
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Phase to address:** Phase 1 (MVP) - Must secure from launch.

**Sources:**
- [How to Secure Vercel Cron Job routes](https://codingcat.dev/post/how-to-secure-vercel-cron-job-routes-in-next-js-14-app-router)

---

## UX Pitfalls

### U1: No Progress Feedback During Long Generation

**What goes wrong:** Admin clicks "Generate" -> nothing happens for 10 minutes -> did it work? They click again. Now two generations running.

**Why it happens:** 5-15 minute async operation with no feedback. User assumes failure.

**Consequences:**
- Multiple duplicate generations
- Wasted API quota
- Frustrated admin experience

**Prevention:**
1. Immediate acknowledgment: "Generation started at [time]"
2. Status polling with progress indicators
3. Estimated completion time display
4. Disable "Generate" button while pending
5. Real-time status updates via Supabase Realtime

**Warning signs:**
- Multiple "pending" entries for same topic/date
- Admin complaints about "not knowing if it worked"

**Phase to address:** Phase 2 - UX refinement after core works.

**Sources:**
- [MCP Async Tasks for AI Agent Workflows](https://workos.com/blog/mcp-async-tasks-ai-agent-workflows)
- [Asynchronous Operations in REST APIs](https://zuplo.com/learning-center/asynchronous-operations-in-rest-apis-managing-long-running-tasks)

---

### U2: Markdown Rendering Edge Cases

**What goes wrong:** Gemini outputs complex tables, nested lists, or unusual citation formats. Frontend renders them incorrectly or not at all.

**Why it happens:** Standard Markdown renderers don't handle all edge cases:
- Multi-line table cells (GFM doesn't support)
- Merged cells (not standard Markdown)
- Footnote-style citations (varies by renderer)
- Very long code blocks
- Nested blockquotes

**Prevention:**
1. Test renderer with representative Gemini outputs
2. Use robust library (react-markdown with remark-gfm)
3. Add CSS for graceful degradation
4. Implement pre-processing to normalize edge cases
5. Consider sanitization for security (XSS)

**Phase to address:** Phase 2 - After content generation works.

**Sources:**
- [Advanced Markdown Tables Guide](https://blog.markdowntools.com/posts/markdown-tables-advanced-features-and-styling-guide)
- [Tables in Markdown Complete Guide](https://www.glukhov.org/post/2025/11/tables-in-markdown/)

---

### U3: No Failure Communication

**What goes wrong:** Generation fails silently. Admin sees "pending" forever. No notification, no error message.

**Why it happens:** Focus on happy path. Error states not designed.

**Prevention:**
1. Explicit failure states in database (not just "pending" forever)
2. Error messages stored with failure reason
3. Email/notification on failure
4. Clear "Retry" action available
5. Timeout that converts "pending" to "failed" after reasonable period

**Phase to address:** Phase 2 - Error handling after core functionality.

---

## "Looks Done But Isn't" Checklist

Features that appear complete but have hidden gaps.

| Feature | Looks Done | Actually Missing |
|---------|------------|------------------|
| Cron job | Schedule configured | Timeout handling, idempotency, failure recovery |
| Admin auth | Login works | Role verification, RLS policies, session refresh |
| Content generation | Report appears | Quality validation, length check, citation verification |
| Markdown rendering | Text displays | Tables, citations, code blocks, XSS sanitization |
| Error handling | Try/catch exists | Retry logic, user notification, logging, monitoring |
| Database queries | Data returned | Indexes, pagination, RLS performance |
| API routes | Endpoints work | Rate limiting, authorization, input validation |

---

## Pitfall-to-Phase Mapping

| Phase | Must Address | Should Address | Can Defer |
|-------|--------------|----------------|-----------|
| **Phase 1: MVP** | P1 (Quota), P2 (Timeout), P3 (RLS), S1-S3 (Security), G1 (API abstraction), G4 (Cache) | T1 (Topics DB), T2 (Idempotency), F2 (Pagination) | F1 (Indexes) |
| **Phase 2: Quality** | P4 (Validation), U1 (Progress), U2 (Markdown), U3 (Failure comms) | G2 (Memory), T3 (Consistency) | - |
| **Phase 3: Polish** | G3 (Timing precision), F1 (Indexes) | Performance optimization | - |

---

## Monitoring Checklist

Critical metrics to track from day one:

1. **Generation metrics:**
   - Time from trigger to completion
   - Success/failure rate
   - Word count distribution
   - API quota consumption

2. **System health:**
   - Cron execution success
   - Serverless function duration
   - Database query latency
   - Error rates by type

3. **Security events:**
   - Failed auth attempts
   - RLS policy denials
   - Unauthorized endpoint access

---

## Sources

### Official Documentation
- [Gemini Deep Research Agent](https://ai.google.dev/gemini-api/docs/deep-research)
- [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Background Tasks](https://supabase.com/docs/guides/functions/background-tasks)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Troubleshooting Cron Jobs](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)

### Community & Industry Reports
- [Gemini API Pricing Changes December 2025](https://www.aifreeapi.com/en/posts/gemini-api-pricing-and-quotas)
- [CVE-2025-48757 Supabase RLS Exposure](https://vibeappscanner.com/supabase-row-level-security)
- [Stop AI Hallucinations Guide 2025](https://infomineo.com/artificial-intelligence/stop-ai-hallucinations-detection-prevention-verification-guide-2025/)
- [Vercel Timeout Workarounds](https://www.inngest.com/blog/vercel-long-running-background-functions)
- [OpenAI Rate Limit Best Practices](https://cookbook.openai.com/examples/how_to_handle_rate_limits)

### API Error Handling
- [Gemini API Error Handling Best Practices](https://www.appaca.ai/resources/ai-models/gemini-api-error-handling-best-practices)
- [API Rate Limiting Strategies](https://orq.ai/blog/api-rate-limit)
