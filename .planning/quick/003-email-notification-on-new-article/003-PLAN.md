---
phase: quick-003
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - src/lib/email/notify.ts
  - src/lib/generation/runner.ts
  - .env.local.example
autonomous: true
user_setup:
  - service: resend
    why: "Email delivery API"
    env_vars:
      - name: RESEND_API_KEY
        source: "Resend Dashboard -> API Keys -> Create API Key"
      - name: NOTIFICATION_EMAIL
        source: "Set to: matan.benhaim@gmail.com"
    account_setup:
      - task: "Create Resend account"
        location: "https://resend.com/signup"
      - task: "Verify sending domain (or use onboarding@resend.dev for testing)"
        location: "Resend Dashboard -> Domains"

must_haves:
  truths:
    - "Email sent to matan.benhaim@gmail.com when report is published"
    - "Email contains report title and link"
    - "Email failure does not break report generation"
  artifacts:
    - path: "src/lib/email/notify.ts"
      provides: "Email notification function"
      exports: ["sendNewReportNotification"]
    - path: "src/lib/generation/runner.ts"
      provides: "Report generation with email hook"
      contains: "sendNewReportNotification"
  key_links:
    - from: "src/lib/generation/runner.ts"
      to: "src/lib/email/notify.ts"
      via: "import and call after report save"
      pattern: "sendNewReportNotification"
---

<objective>
Add email notification to matan.benhaim@gmail.com whenever a new report is published.

Purpose: Get notified immediately when the automated system publishes new content.
Output: Email sent on every successful report publication with title and link.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/lib/generation/runner.ts
@src/types/database.ts
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Resend and create email notification module</name>
  <files>
    - package.json
    - src/lib/email/notify.ts
    - .env.local.example
  </files>
  <action>
1. Install Resend SDK:
   ```bash
   npm install resend
   ```

2. Create `src/lib/email/notify.ts`:
   - Import Resend from 'resend'
   - Initialize with `process.env.RESEND_API_KEY`
   - Export async function `sendNewReportNotification(report: { title: string; slug: string })`:
     - Build report URL using `process.env.NEXT_PUBLIC_SITE_URL || 'https://dailydeep.co.il'`
     - Use `resend.emails.send()` with:
       - from: 'Daily Deep <onboarding@resend.dev>' (or verified domain later)
       - to: process.env.NOTIFICATION_EMAIL || 'matan.benhaim@gmail.com'
       - subject: `New Report Published: ${report.title}`
       - html: Simple HTML with title, link to report, and timestamp
     - Wrap in try/catch - log errors but do NOT throw (email failure must not break generation)
     - Return `{ success: boolean; error?: string }`

3. Add to `.env.local.example`:
   ```
   # Email Notifications (Resend)
   # Get API key from: https://resend.com/api-keys
   RESEND_API_KEY=your-resend-api-key
   NOTIFICATION_EMAIL=matan.benhaim@gmail.com
   ```
  </action>
  <verify>
    - `npm ls resend` shows resend installed
    - `src/lib/email/notify.ts` exists with exported `sendNewReportNotification`
    - `.env.local.example` contains RESEND_API_KEY and NOTIFICATION_EMAIL
  </verify>
  <done>Resend installed and email module created with non-blocking notification function</done>
</task>

<task type="auto">
  <name>Task 2: Hook email notification into report generation</name>
  <files>
    - src/lib/generation/runner.ts
  </files>
  <action>
1. At top of `runner.ts`, add import:
   ```typescript
   import { sendNewReportNotification } from '@/lib/email/notify';
   ```

2. After successful report save (around line 94, after `console.log(...Report saved successfully...)`), add:
   ```typescript
   // Send email notification (fire-and-forget, don't await to avoid blocking)
   sendNewReportNotification({
     title: savedReport.title,
     slug: savedReport.slug,
   }).then((result) => {
     if (result.success) {
       console.log(`[Generation ${jobId}] Email notification sent`);
     } else {
       console.log(`[Generation ${jobId}] Email notification failed: ${result.error}`);
     }
   });
   ```

Note: Use `.then()` not `await` - email is fire-and-forget, should not block job completion tracking.
  </action>
  <verify>
    - `grep -n "sendNewReportNotification" src/lib/generation/runner.ts` shows import and usage
    - `npm run build` succeeds with no type errors
  </verify>
  <done>Email notification fires on every successful report publication without blocking generation flow</done>
</task>

</tasks>

<verification>
1. `npm run build` - no errors
2. `grep -r "sendNewReportNotification" src/` - shows notify.ts export and runner.ts usage
3. Code review: email call is in try/catch and uses .then() (non-blocking)
</verification>

<success_criteria>
- Resend package installed
- Email module at src/lib/email/notify.ts exports sendNewReportNotification
- runner.ts imports and calls notification after report save
- Build passes
- Email failure is logged but does not throw/break generation
</success_criteria>

<output>
After completion, create `.planning/quick/003-email-notification-on-new-article/003-SUMMARY.md`
</output>
