# Phase 2: Generation Engine - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can trigger AI report generation (for testing) and manage published content. This phase builds the Gemini integration, async polling, quality validation, and admin dashboard. Automated daily generation and topic curation belong to Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Admin Authentication
- Email + password login (no magic link)
- Single admin account — hardcode allowed email in config/env
- Simple error message on failed login ("Invalid credentials")
- No "Forgot password" flow — reset directly in Supabase if needed
- No rate limiting or lockout (single-admin site)

### Dashboard Purpose
- Primary focus: Report management + test trigger for QA
- View report list with status badges (draft, published, failed)
- Delete/unpublish reports
- Basic stats display (total reports, reports this month, latest publish date)
- "Generate Test Report" button for QA testing only
- Today's category shown prominently at top ("Today is Science Tuesday")

### Generation Flow
- Test trigger is for QA only — production generation is automated in Phase 3
- Topic input field when triggering test (admin types topic manually)
- 5-15 minute generation time requires async polling

### Claude's Discretion
- Progress UI design (status text vs progress bar with steps)
- Exact dashboard layout and component arrangement
- Error state handling and retry UX
- Polling interval for generation status

</decisions>

<specifics>
## Specific Ideas

- Category should be shown prominently: "Today is Science Tuesday" style display
- Test generation is explicitly for QA — no production manual generation expected
- Deploy to Vercel after Phase 2 is complete (not during Phase 1)

</specifics>

<deferred>
## Deferred Ideas

- **Automatic topic curation from Google Trends** — User wants topics auto-selected based on last 24h global trending topics with specific logic. This belongs in Phase 3 (Automation) or as enhancement.
- **Email alerts for daily topic** — User wants subscribers notified of today's topic. New capability, separate phase.
- The specific "logic for curation" needs to be discussed when planning Phase 3.

</deferred>

---

*Phase: 02-generation-engine*
*Context gathered: 2026-01-25*
