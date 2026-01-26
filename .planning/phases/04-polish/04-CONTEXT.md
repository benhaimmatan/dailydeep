# Phase 4: Polish - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

SEO optimization and structured data for discoverability. This phase adds meta tags, OpenGraph images, semantic HTML, and JSON-LD Article schema to make reports rank well in search engines and display beautifully when shared on social media.

</domain>

<decisions>
## Implementation Decisions

### Meta tag content
- Title format: "Report Title | The Daily Deep" — branded suffix for all report pages
- Description: AI-generated SEO summary — add `seo_description` field to Gemini output schema during generation
- Keywords: Generate 5-8 keywords from category name + report topic
- Other pages: Homepage, archive, and category pages each get unique, tailored meta tags

### Social sharing preview
- OG image style: Dynamic with title overlay — generate images with report title, category badge, and branding (best for engagement/CTR)
- Image generation: Use @vercel/og for edge-generated images at request time — no storage needed
- OG description: Same as meta description (AI-generated summary) for consistency

### Structured data (JSON-LD)
- Author: "AI-assisted" byline — transparent about AI generation
- Article stats, publisher detail, breadcrumbs: See Claude's Discretion below

### Semantic HTML
- Heading hierarchy, semantic tags, ARIA landmarks, image alt text: See Claude's Discretion below

### Claude's Discretion
- Twitter Card type selection (summary vs summary_large_image)
- Whether OG description should be truncated for social context
- Word count and reading time in JSON-LD (timeRequired field)
- Publisher schema depth (full vs minimal)
- BreadcrumbList schema placement
- Heading hierarchy validation/transformation
- Semantic tag depth (<article> only vs full <section> structure)
- ARIA landmarks vs relying on semantic HTML inference
- Image alt text approach based on content type

</decisions>

<specifics>
## Specific Ideas

- Dynamic OG images should use the gold accent color and Playfair Display font to match site branding
- SEO description should be distinct from the report intro — written specifically for search/social context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-polish*
*Context gathered: 2026-01-26*
