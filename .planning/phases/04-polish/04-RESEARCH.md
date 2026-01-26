# Phase 4: Polish - Research

**Researched:** 2026-01-26
**Domain:** SEO, Structured Data, Social Sharing, Semantic HTML
**Confidence:** HIGH

## Summary

This phase implements SEO optimization and structured data for discoverability. The research covers four main areas: (1) dynamic meta tags using Next.js 14's Metadata API, (2) OpenGraph and Twitter Card meta tags for social sharing with dynamic image generation using `@vercel/og`, (3) semantic HTML structure improvements, and (4) JSON-LD Article structured data for rich search results.

The project already has a foundation for SEO with `seo_title`, `seo_description`, and `seo_keywords` fields in the Gemini schema and database. The report page already uses `generateMetadata` with basic OpenGraph. This phase enhances the existing implementation with proper Twitter Cards, dynamic OG images, semantic HTML, and JSON-LD.

**Primary recommendation:** Use Next.js file-based metadata API (`opengraph-image.tsx`) for dynamic OG image generation with `ImageResponse`, add JSON-LD Article schema inline in report pages, and wrap report content in semantic HTML5 elements.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/og` | 14.2.x (bundled) | Dynamic OG image generation | Official Next.js API, built on @vercel/og and Satori |
| `schema-dts` | latest | TypeScript types for JSON-LD schemas | Google-recommended, provides type safety for schema.org |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/metadata` | 14.2.x (bundled) | Metadata API types | Already in use, extend for Twitter cards |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next/og` | External OG image service (Cloudinary, imgix) | More features but adds external dependency and cost |
| `schema-dts` | Manual JSON-LD objects | Less type safety, easier to make schema errors |

**Installation:**
```bash
npm install schema-dts
```

Note: `next/og` is bundled with Next.js 14 - no separate installation needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── report/
│       └── [slug]/
│           ├── page.tsx              # Report page with JSON-LD
│           ├── opengraph-image.tsx   # Dynamic OG image
│           └── twitter-image.tsx     # Optional: separate Twitter image
├── lib/
│   └── seo/
│       └── json-ld.ts               # JSON-LD schema helpers
└── types/
    └── seo.ts                       # SEO-related types
```

### Pattern 1: File-Based Dynamic OG Image
**What:** Use `opengraph-image.tsx` in route segments to generate images at request time
**When to use:** When each page needs a unique, dynamically generated social image
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
// app/report/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Report preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Fetch report data and generate image
  return new ImageResponse(/* JSX element */, { ...size })
}
```

### Pattern 2: JSON-LD in Server Component
**What:** Render JSON-LD as inline script tag in page component
**When to use:** For structured data that search engines can parse
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/json-ld
import type { Article, WithContext } from 'schema-dts'

const jsonLd: WithContext<Article> = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: report.title,
  // ... other properties
}

return (
  <article>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
    {/* ... content */}
  </article>
)
```

### Pattern 3: Extended generateMetadata with Twitter Cards
**What:** Extend existing metadata to include full Twitter Card configuration
**When to use:** All pages that need social sharing optimization
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const report = await getReport((await params).slug)
  return {
    title: report.seo_title || report.title,
    description: report.seo_description,
    keywords: report.seo_keywords,
    openGraph: {
      type: 'article',
      title: report.seo_title || report.title,
      description: report.seo_description,
      publishedTime: report.published_at,
      modifiedTime: report.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: report.seo_title || report.title,
      description: report.seo_description,
    },
  }
}
```

### Anti-Patterns to Avoid
- **Client-side JSON-LD injection:** Search engines may not execute JavaScript - always render JSON-LD server-side
- **Missing metadataBase:** Always set `metadataBase` in root layout for proper URL resolution
- **Unescaped JSON-LD:** Always sanitize with `.replace(/</g, '\\u003c')` to prevent XSS
- **Skipping heading levels:** Don't jump from h1 to h3 - maintain hierarchy for accessibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OG image generation | Canvas-based image generator | `next/og` with `ImageResponse` | Handles fonts, layout, edge rendering automatically |
| Schema.org types | Manual TypeScript interfaces | `schema-dts` package | Complete, up-to-date types for all schema.org entities |
| Metadata management | Manual `<meta>` tags | Next.js Metadata API | Handles deduplication, merging, proper ordering |
| Social image sizing | Manual dimension calculations | `next/og` defaults (1200x630) | Industry-standard dimensions, automatic header generation |

**Key insight:** Next.js Metadata API handles the complexity of meta tag generation, including proper ordering, deduplication, and protocol-specific requirements (OG vs Twitter).

## Common Pitfalls

### Pitfall 1: Missing metadataBase
**What goes wrong:** OG images show relative paths instead of absolute URLs, breaking social previews
**Why it happens:** Next.js needs a base URL to construct absolute paths for images
**How to avoid:** Set `metadataBase` in root `layout.tsx`:
```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
}
```
**Warning signs:** Social preview debuggers show broken images or relative paths

### Pitfall 2: Edge Function Size Limits
**What goes wrong:** OG image generation fails in production with size errors
**Why it happens:** Custom fonts add significant size; Vercel free tier has 1MB edge function limit
**How to avoid:** Use only 1-2 font weights, consider subset fonts for specific characters
**Warning signs:** Works locally but fails on Vercel deployment

### Pitfall 3: Unescaped JSON-LD Content
**What goes wrong:** XSS vulnerability or broken JSON-LD when content contains `<` characters
**Why it happens:** `JSON.stringify()` doesn't escape HTML-significant characters
**How to avoid:** Always use `.replace(/</g, '\\u003c')` after `JSON.stringify()`
**Warning signs:** Structured data validation fails, or security scanner flags XSS

### Pitfall 4: Twitter Card Image Dimensions
**What goes wrong:** Images appear cropped or distorted on Twitter/X
**Why it happens:** Using wrong aspect ratio - Twitter requires different dimensions than OG
**How to avoid:** Use 1200x630 (1.91:1) for `summary_large_image`, or create separate `twitter-image.tsx`
**Warning signs:** Preview looks good on Facebook but bad on Twitter

### Pitfall 5: Semantic HTML Without Proper Hierarchy
**What goes wrong:** Screen readers announce incorrect document structure
**Why it happens:** React-markdown may generate headings starting at wrong level
**How to avoid:** Ensure h1 is only for page title, content headings start at h2
**Warning signs:** Accessibility audit flags heading order issues (WCAG 2.4.6)

## Code Examples

Verified patterns from official sources:

### Loading Custom Fonts for OG Images
```typescript
// Source: https://vercel.com/guides/using-custom-font + Satori docs
async function loadGoogleFont(font: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`
  const css = await (await fetch(url)).text()
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)

  if (resource) {
    const response = await fetch(resource[1])
    if (response.status === 200) {
      return await response.arrayBuffer()
    }
  }
  throw new Error('Failed to load font data')
}
```

### Complete Article JSON-LD Schema
```typescript
// Source: https://developers.google.com/search/docs/appearance/structured-data/article
import type { Article, WithContext } from 'schema-dts'

function generateArticleJsonLd(report: ReportWithCategory): WithContext<Article> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: report.title,
    description: report.seo_description || report.summary,
    image: `${process.env.NEXT_PUBLIC_SITE_URL}/report/${report.slug}/opengraph-image`,
    datePublished: report.published_at,
    dateModified: report.updated_at,
    author: {
      '@type': 'Organization',
      name: 'The Daily Deep',
      description: 'AI-assisted investigative journalism',
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Daily Deep',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`,
      },
    },
    wordCount: report.word_count,
    keywords: report.seo_keywords?.join(', '),
    articleSection: report.category?.name,
    inLanguage: 'en-US',
  }
}
```

### Dynamic OG Image with Brand Styling
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
import { ImageResponse } from 'next/og'

export const alt = 'The Daily Deep Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = await getReport(slug)

  // Load Playfair Display for brand consistency
  const playfairData = await loadGoogleFont('Playfair+Display:wght@700', report.title)

  return new ImageResponse(
    (
      <div
        style={{
          background: '#111111', // Dark background
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
        }}
      >
        {/* Category badge */}
        <div style={{ color: '#C9A962', fontSize: 24 }}>
          {report.category?.name}
        </div>
        {/* Title */}
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontSize: 64,
            color: '#F2F2F2',
            marginTop: '20px',
            lineHeight: 1.2,
          }}
        >
          {report.title}
        </div>
        {/* Branding */}
        <div style={{ marginTop: 'auto', color: '#C9A962', fontSize: 28 }}>
          The Daily Deep
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Playfair Display', data: playfairData, weight: 700, style: 'normal' }],
    }
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/og` import | `next/og` import | Next.js 14.0.0 | Bundled, no separate install needed |
| Manual OG meta tags | `generateMetadata` API | Next.js 13.2 | Type-safe, automatic deduplication |
| Microdata for structured data | JSON-LD | ~2020 | Google prefers JSON-LD, easier to implement |
| `twitter:card` as fallback | Explicit Twitter metadata | Ongoing | Better control over Twitter-specific display |

**Deprecated/outdated:**
- `themeColor` in metadata: Deprecated in Next.js 14, use viewport configuration
- `colorScheme` in metadata: Deprecated in Next.js 14, use viewport configuration
- `@vercel/og` direct import: Still works but `next/og` is preferred in App Router

## Open Questions

Things that couldn't be fully resolved:

1. **Playfair Display Font Loading**
   - What we know: Google Fonts API can serve TTF/OTF for OG images
   - What's unclear: Whether Vercel's 1MB edge limit accommodates Playfair + display text
   - Recommendation: Test with actual report titles; fall back to subset or system font if needed

2. **OG Image Caching Strategy**
   - What we know: Next.js defaults to static optimization with hash-based caching
   - What's unclear: Optimal revalidation time for reports that might get updated
   - Recommendation: Start with default (static), add `revalidate` only if needed

## Sources

### Primary (HIGH confidence)
- [Next.js generateMetadata API Reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) - Complete metadata configuration
- [Next.js ImageResponse API Reference](https://nextjs.org/docs/app/api-reference/functions/image-response) - OG image generation
- [Next.js opengraph-image File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) - File-based metadata
- [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld) - Structured data implementation
- [Google Article Structured Data](https://developers.google.com/search/docs/appearance/structured-data/article) - Required/recommended properties
- [Schema.org Article](https://schema.org/Article) - Complete property definitions
- [Vercel @vercel/og Reference](https://vercel.com/docs/og-image-generation/og-image-api) - ImageResponse options

### Secondary (MEDIUM confidence)
- [W3C WAI Headings Tutorial](https://www.w3.org/WAI/tutorials/page-structure/headings/) - Semantic heading hierarchy
- [WebAIM Semantic Structure](https://webaim.org/techniques/semanticstructure/) - Accessibility best practices
- [Twitter/X Card Documentation](https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image) - Twitter card specs

### Tertiary (LOW confidence)
- Community examples for Google Fonts loading in @vercel/og - Needs validation with actual implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using official Next.js bundled APIs
- Architecture: HIGH - Following official documentation patterns
- Pitfalls: MEDIUM - Based on community reports and official gotchas
- Font loading: MEDIUM - Pattern is documented but edge limits need testing

**Research date:** 2026-01-26
**Valid until:** 60 days (stable APIs, Next.js 14 is mature)
