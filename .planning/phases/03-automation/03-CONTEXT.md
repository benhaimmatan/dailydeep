# Phase 3: Automation - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Daily automated report publishing via scheduled Vercel cron job at 6AM UTC. Includes idempotency to prevent duplicate reports, failure detection/logging, and secured endpoint. Manual override from dashboard is in scope; email notifications are not.

</domain>

<decisions>
## Implementation Decisions

### Timing & Retry Behavior
- Cron runs at 6AM UTC fixed — no configurable schedule
- Weekdays only (Monday through Friday) — skip Saturday and Sunday
- If cron misses the 6AM window (Vercel issue), skip that day — no catch-up
- Single attempt per trigger — if generation fails, no automatic retry

### Duplicate Prevention
- Idempotency check: query reports table for any report with today's date
- If duplicate detected: return 200 OK with message "already generated" — silent success
- Skip if any generation job is currently in-progress (status: 'generating')
- Admin can force re-generation via dashboard button, bypassing duplicate check

### Failure Notifications
- Dashboard only — no email notifications
- Failed status shows in report list (no prominent banner alert)
- Error message visible in dashboard (e.g., "API timeout", "validation failed")
- One-click retry button for failed generations

### Logging
- Standard logging: cron start, completion status, and errors
- Always log selected topic and category for each run
- 30-day retention for run history

### Claude's Discretion
- Where to store logs (Vercel logs vs database table) — pick based on complexity/value
- Exact retry button implementation details
- How to handle edge case: job stuck in 'generating' status

</decisions>

<specifics>
## Specific Ideas

- Weekend skip aligns with typical news/content consumption patterns
- "Fire and forget" on failure — admin checks dashboard rather than getting interrupted by emails
- Retry button is for human-initiated recovery, not automated retry loops

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-automation*
*Context gathered: 2026-01-26*
