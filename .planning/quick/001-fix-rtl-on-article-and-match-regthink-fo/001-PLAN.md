---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/report/[slug]/page.tsx
  - src/components/report/report-header.tsx
  - src/components/report/report-content.tsx
  - src/components/report/report-toc.tsx
  - src/app/globals.css
autonomous: true

must_haves:
  truths:
    - "Hebrew text displays right-to-left"
    - "Typography matches regthink.org editorial style"
    - "Font sizes are 20px body, larger headings"
    - "Line height is relaxed (1.6-1.8)"
  artifacts:
    - path: "src/app/report/[slug]/page.tsx"
      provides: "RTL article wrapper with dir attribute"
    - path: "src/components/report/report-content.tsx"
      provides: "Updated typography classes"
  key_links:
    - from: "page.tsx"
      to: "report components"
      via: "dir=rtl on article element"
---

<objective>
Fix RTL (right-to-left) text direction for Hebrew article content and update typography to match regthink.org editorial style.

Purpose: Hebrew reports currently display left-to-right which is incorrect. Typography should match the clean, readable style from https://www.regthink.org/fall-of-sdf2026/ with proper font sizes and line heights.

Output: Report pages with proper RTL layout, 20px body text, 1.6 line-height, and Hebrew-appropriate typography.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Current state:
- Reports render at `/report/[slug]` using Next.js
- Layout uses Playfair Display for headings, Source Sans 3 for body
- Content rendered via ReactMarkdown with custom components
- No RTL support currently (html lang="en", no dir attribute)
- Body text is text-lg (18px), line-height leading-relaxed

Reference typography (regthink.org):
- RTL text direction for Hebrew
- Font sizes: 36px/42px large headings, 20px body, 13px small
- Line height: 1.6
- Clean editorial appearance with good letter-spacing

Files to modify:
- src/app/report/[slug]/page.tsx - Add dir="rtl" to article
- src/components/report/report-header.tsx - RTL-aware styling
- src/components/report/report-content.tsx - Typography updates
- src/components/report/report-toc.tsx - RTL position (should be on left)
- src/app/globals.css - Add RTL utility classes if needed
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add RTL support to report page layout</name>
  <files>
    src/app/report/[slug]/page.tsx
    src/components/report/report-toc.tsx
    src/app/globals.css
  </files>
  <action>
1. In page.tsx:
   - Add `dir="rtl"` attribute to the article element
   - Flip the grid layout so TOC is on LEFT (in RTL, sidebar goes left): change `lg:grid-cols-[1fr_280px]` to `lg:grid-cols-[280px_1fr]`
   - Reorder the children: sidebar/aside FIRST, then main content (grid auto-placement will position correctly)

2. In report-toc.tsx:
   - Update the "On This Page" heading to Hebrew: "בעמוד זה"
   - Keep text-align as is (RTL will naturally align right)

3. In globals.css:
   - Add RTL-specific utilities if needed for list markers and other elements:
   ```css
   [dir="rtl"] ul {
     @apply mr-6 ml-0;
   }
   [dir="rtl"] ol {
     @apply mr-6 ml-0;
   }
   ```
  </action>
  <verify>
    - Run `npm run build` to ensure no compilation errors
    - Visual check: Hebrew text should flow right-to-left
    - TOC should appear on the left side of the content
  </verify>
  <done>
    - Article element has dir="rtl" attribute
    - Grid layout places TOC on left, content on right
    - List markers appear on the right side (RTL standard)
  </done>
</task>

<task type="auto">
  <name>Task 2: Update typography to match regthink.org style</name>
  <files>
    src/components/report/report-content.tsx
    src/components/report/report-header.tsx
  </files>
  <action>
1. In report-content.tsx, update the markdown components:
   - Paragraphs: Change from `text-lg` (18px) to `text-xl` (20px), keep `leading-relaxed` (line-height ~1.625)
   - Or add explicit style for 20px with 1.6 line-height: `text-[20px] leading-[1.6]`
   - List items: Match paragraph size `text-xl leading-[1.6]` or `text-[20px] leading-[1.6]`
   - Headings: Keep existing Playfair Display but ensure sizes match reference:
     - h1: text-4xl (36px) - already correct
     - h2: text-2xl (24px) could go to text-3xl (30px) for more impact
     - h3: text-xl (20px) - keep as is
   - Blockquotes: Update to `leading-[1.6]` for consistency
   - Tables: Ensure td/th have adequate padding and 20px text

2. In report-header.tsx:
   - Title (h1): Keep text-4xl md:text-5xl - this matches reference large heading style
   - Subtitle: Change from `text-xl` to `text-[20px] leading-[1.6]` for consistency
   - Meta line (date/reading time): Keep text-sm, this is appropriate for metadata
   - Add Hebrew reading time suffix: Consider changing "min read" to "דקות קריאה"
  </action>
  <verify>
    - Inspect rendered page: body text should be 20px
    - Line height should be 1.6 (measure via dev tools)
    - Headings should have clear hierarchy
  </verify>
  <done>
    - Body text is 20px with 1.6 line-height
    - Typography has clean editorial appearance matching regthink.org
    - Consistent sizing across paragraphs, lists, and quotes
  </done>
</task>

<task type="auto">
  <name>Task 3: RTL adjustments for UI details</name>
  <files>
    src/components/report/report-header.tsx
    src/components/report/report-content.tsx
    src/components/report/report-sources.tsx
  </files>
  <action>
1. In report-header.tsx:
   - Ensure meta line flex layout works in RTL (should auto-reverse with dir=rtl on parent)
   - Change "min read" to Hebrew "דקות קריאה" for consistency
   - The pipe separator "|" should still work in RTL

2. In report-content.tsx:
   - For lists (ul/ol), change `ml-6` to use logical properties or handle via globals.css RTL rules
   - Blockquote: Change `border-l-4` and `pl-4` to RTL equivalents: `border-r-4` and `pr-4` (or use logical: `border-s-4` and `ps-4`)
   - Tables: Ensure `text-left` on th becomes `text-right` for RTL, or use `text-start`

3. In report-sources.tsx (if it exists and has content):
   - Check for any directional styling that needs RTL adjustment
   - Ensure sources list displays correctly in RTL
  </action>
  <verify>
    - Blockquote border appears on RIGHT side (correct for RTL)
    - Lists have markers on right side with proper indentation
    - Table headers align correctly for RTL
    - Reading time shows Hebrew text
  </verify>
  <done>
    - All UI elements respect RTL direction
    - Borders, margins, and paddings use correct RTL positioning
    - Hebrew labels used where appropriate
  </done>
</task>

</tasks>

<verification>
1. Build check: `npm run build` passes without errors
2. Visual verification at a report URL:
   - Text flows right-to-left
   - TOC on left side
   - Body text is 20px, line-height 1.6
   - Blockquote border on right
   - Lists indent from right
   - Clean, readable editorial typography
</verification>

<success_criteria>
- Hebrew content displays with proper RTL text direction
- Typography matches regthink.org: 20px body, 1.6 line-height, clean editorial style
- All directional UI elements (borders, margins, lists) respect RTL
- Build passes and page renders without errors
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-rtl-on-article-and-match-regthink-fo/001-SUMMARY.md`
</output>
