# Requirements: The Daily Deep

**Defined:** 2026-01-25
**Core Value:** One click generates a 3,500+ word investigative report with specific data points, tables, citations, and historical context

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Content Display

- [ ] **DISP-01**: Markdown rendering with proper typography (Playfair Display serif, 16px+, good line height)
- [ ] **DISP-02**: Dark mode design (#0A0A0A background, #C9A962 gold accent)
- [ ] **DISP-03**: Reading time estimate displayed on reports
- [ ] **DISP-04**: Mobile-responsive layout

### Content Discovery

- [ ] **DISC-01**: Archive page showing all published reports in grid layout
- [ ] **DISC-02**: Search reports by title/content/keywords (client-side)
- [ ] **DISC-03**: Filter reports by category dropdown
- [ ] **DISC-04**: Group reports by month/year with headers

### Pages

- [ ] **PAGE-01**: Home page displays latest published report (or hero CTA if none)
- [ ] **PAGE-02**: Report detail page with full content, sources, metadata
- [ ] **PAGE-03**: Archive page with search/filter/grid
- [ ] **PAGE-04**: Admin dashboard (protected)

### Generation

- [ ] **GEN-01**: Manual generation trigger via admin button
- [ ] **GEN-02**: Progress feedback during 5-15 min generation (status updates)
- [ ] **GEN-03**: Quality validation before publish (word count >= 3000, has sources)
- [ ] **GEN-04**: Automated daily generation at 6AM UTC via Vercel cron
- [ ] **GEN-05**: Async polling architecture (Gemini Interactions API)

### SEO

- [ ] **SEO-01**: Dynamic meta tags per report (title, description, keywords)
- [ ] **SEO-02**: OpenGraph and Twitter card meta tags
- [ ] **SEO-03**: Semantic HTML structure (article, section, headings)
- [ ] **SEO-04**: JSON-LD structured data (Article schema)

### Admin

- [ ] **ADMIN-01**: Secure admin authentication (Supabase Auth, email/password)
- [ ] **ADMIN-02**: Protected admin routes (redirect non-admins)
- [ ] **ADMIN-03**: Report list with status badges, dates, categories
- [ ] **ADMIN-04**: Delete report functionality
- [ ] **ADMIN-05**: Dashboard stats (total reports, this month, latest date)

### Security

- [ ] **SEC-01**: Supabase RLS enabled on reports table
- [ ] **SEC-02**: Admin role check on protected API routes
- [ ] **SEC-03**: Cron endpoint authorization (secret header)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Podcast/Audio

- **AUDIO-01**: Generate podcast script from report content (HOST vs EXPERT dialogue)
- **AUDIO-02**: Text-to-speech integration for audio generation
- **AUDIO-03**: Audio player component with play/pause, seek, volume
- **AUDIO-04**: Expandable podcast script transcript

### Enhanced UX

- **UX-01**: Reading progress indicator (visual bar as you scroll)
- **UX-02**: Section navigation (jump to headers)
- **UX-03**: Citation tooltips on hover
- **UX-04**: Related reports suggestions

### Analytics

- **ANLY-01**: Basic analytics (page views, popular reports)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts for readers | Public site, no login required for reading |
| Comments on reports | Adds moderation complexity, not core to value |
| Subscriptions/paywall | May add later, not v1 |
| OAuth login (Google, GitHub) | Email/password sufficient for admin |
| Real-time updates | Daily publishing cadence doesn't need real-time |
| Infinite scroll | Pagination/grouped archive is cleaner |
| Content personalization | One report per day, no personalization needed |
| Mobile app | Web-first, responsive design covers mobile |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISP-01 | Phase 1 | Pending |
| DISP-02 | Phase 1 | Pending |
| DISP-03 | Phase 1 | Pending |
| DISP-04 | Phase 1 | Pending |
| DISC-01 | Phase 1 | Pending |
| DISC-02 | Phase 1 | Pending |
| DISC-03 | Phase 1 | Pending |
| DISC-04 | Phase 1 | Pending |
| PAGE-01 | Phase 1 | Pending |
| PAGE-02 | Phase 1 | Pending |
| PAGE-03 | Phase 1 | Pending |
| PAGE-04 | Phase 2 | Pending |
| GEN-01 | Phase 2 | Pending |
| GEN-02 | Phase 2 | Pending |
| GEN-03 | Phase 2 | Pending |
| GEN-04 | Phase 3 | Pending |
| GEN-05 | Phase 2 | Pending |
| SEO-01 | Phase 4 | Pending |
| SEO-02 | Phase 4 | Pending |
| SEO-03 | Phase 4 | Pending |
| SEO-04 | Phase 4 | Pending |
| ADMIN-01 | Phase 2 | Pending |
| ADMIN-02 | Phase 2 | Pending |
| ADMIN-03 | Phase 2 | Pending |
| ADMIN-04 | Phase 2 | Pending |
| ADMIN-05 | Phase 2 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after roadmap creation*
