---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/archive/page.tsx
  - src/components/home/latest-report.tsx
autonomous: true

must_haves:
  truths:
    - "All public pages display Hebrew text right-to-left"
    - "Landing page has visible link to archive/all reports"
    - "Archive page displays reports in RTL layout"
  artifacts:
    - path: "src/app/layout.tsx"
      provides: "Global RTL direction and Hebrew lang"
      contains: 'lang="he"'
    - path: "src/components/home/latest-report.tsx"
      provides: "Archive link in latest report view"
      contains: "/archive"
  key_links:
    - from: "src/app/layout.tsx"
      to: "all pages"
      via: "html dir and lang attributes"
---

<objective>
Add RTL support to all public pages and provide archive access from landing page.

Purpose: The site serves Hebrew content. RTL is currently only on the report detail page. Landing page and archive need RTL, and users need a way to access historical reports from the landing page.

Output: All public pages render RTL, archive link visible on landing page.
</objective>

<context>
@src/app/layout.tsx - Root layout, controls html element attributes
@src/app/page.tsx - Landing page
@src/app/archive/page.tsx - Archive page with report list
@src/app/report/[slug]/page.tsx - Report page (already has dir="rtl" on article)
@src/components/home/latest-report.tsx - Latest report component shown on landing
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add global RTL support in root layout</name>
  <files>src/app/layout.tsx</files>
  <action>
Update the html element in RootLayout to include RTL direction and Hebrew language:
- Change `lang="en"` to `lang="he"`
- Add `dir="rtl"` attribute to the html element

This applies RTL globally to all pages, eliminating the need for per-page dir attributes.

Note: The report page currently has `dir="rtl"` on the article element - this can remain as it doesn't conflict, but the global setting now handles all pages consistently.
  </action>
  <verify>
Run `npm run dev` and verify:
- Landing page text aligns right-to-left
- Archive page text aligns right-to-left
- Report page continues to work correctly
  </verify>
  <done>HTML element has `lang="he" dir="rtl"`, all pages render RTL</done>
</task>

<task type="auto">
  <name>Task 2: Add archive link to latest report component</name>
  <files>src/components/home/latest-report.tsx</files>
  <action>
Add a secondary link below the "Read Report" button to access the archive:
- Add a Link component pointing to `/archive`
- Style as a subtle text link (not a button) with muted styling
- Text: "View All Reports" or Hebrew equivalent if appropriate
- Position below the CTA button with appropriate spacing (mt-4)
- Use `text-muted-foreground hover:text-foreground` for subtle appearance

Example placement after the CTA div:
```tsx
<div className="mt-4">
  <Link
    href="/archive"
    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
  >
    View All Reports &rarr;
  </Link>
</div>
```

Note: For RTL, the arrow should point left. Use `&larr;` instead of `&rarr;` since text flows right-to-left.
  </action>
  <verify>
View landing page at `/`:
- "View All Reports" link visible below the main CTA
- Clicking link navigates to `/archive`
- Link has subtle styling that doesn't compete with main CTA
  </verify>
  <done>Landing page shows archive link, users can access all reports</done>
</task>

</tasks>

<verification>
1. `npm run dev` - server starts without errors
2. Visit `/` - page is RTL, archive link visible and functional
3. Visit `/archive` - page is RTL, reports display correctly
4. Visit `/report/[any-slug]` - page continues to work (already had RTL)
5. Click archive link from landing - navigates to archive page
</verification>

<success_criteria>
- All public pages (landing, archive, report) display RTL
- Landing page has visible, functional link to archive
- No visual regressions on existing pages
- Hebrew content reads naturally right-to-left
</success_criteria>

<output>
After completion, create `.planning/quick/002-rtl-on-all-pages-and-archive-link/002-SUMMARY.md`
</output>
