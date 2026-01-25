# Phase 1: Foundation - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Public readers can browse a dark-mode archive of beautifully rendered reports. This includes database schema with RLS security, dark mode design system, report detail pages with markdown rendering, and home/archive pages with search and filtering. Admin functionality and report generation are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Visual Aesthetic
- Premium editorial feel — like The Atlantic or NYT, elegant and authoritative
- Soft dark palette — dark grays (#111-#1a1a1a), not pure black
- Serif typography for body text — traditional editorial, book-like reading
- Gold/amber accent color for links, buttons, highlights — warm, premium feel

### Report Rendering
- Tables with minimal lines — subtle borders, clean and uncluttered
- Citations as inline links — source names hyperlinked within text, natural reading flow
- Sticky sidebar table of contents on desktop — always visible, jump to sections
- Blockquotes with left border accent — gold/amber left border, indented, classic editorial

### Archive & Discovery
- Card grid layout for archive — cards with title, date, category badge
- No excerpt preview on cards — just title, date, and category badge
- Instant filter search — results update as user types
- Filter chips for categories — clickable badges above archive to toggle filter

### Empty & Loading States
- Minimal placeholder when no reports exist — simple "No reports yet" with branding
- Terse no-results message — just "No results", minimal
- Error states with friendly message and retry button

### Claude's Discretion
- Loading state approach (skeleton vs spinner per context)
- Exact spacing, margins, and typography scale
- Responsive breakpoints and mobile adaptations
- Code block styling if reports contain code

</decisions>

<specifics>
## Specific Ideas

- Premium editorial reference: The Atlantic, NYT — authoritative journalism aesthetic
- Tables should feel data-forward but not overwhelming
- TOC sidebar helps navigate 3,500+ word investigative reports

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-25*
