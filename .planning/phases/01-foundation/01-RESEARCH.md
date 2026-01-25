# Phase 1: Foundation - Research

**Researched:** 2026-01-25
**Domain:** Next.js App Router, Supabase, Dark Mode Design System, Markdown Rendering
**Confidence:** HIGH

## Summary

This phase establishes the foundation for a public-facing editorial site with dark mode, markdown-rendered reports, and archive functionality. The research confirms the standard stack of Next.js 14 App Router + Supabase + shadcn/ui + Tailwind CSS is well-documented with mature patterns for this use case.

Key findings:
- **Supabase SSR setup** requires the `@supabase/ssr` package with separate client utilities for browser and server contexts, plus middleware for session refresh
- **Row Level Security (RLS)** must be enabled on all public-schema tables immediately; without policies, data is inaccessible
- **Dark mode theming** uses `next-themes` with shadcn/ui CSS variables, setting `defaultTheme="dark"` since this is a dark-mode-first site
- **Markdown rendering** uses `react-markdown` + `remark-gfm` for tables/GFM features, with custom components for styling
- **Reading time** calculated using standard 250 WPM formula with the `reading-time` npm package

**Primary recommendation:** Set up Supabase with RLS from day one, use CSS variables for the dark theme system, and build the markdown renderer with customizable components for the editorial styling requirements.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 14.x | React framework with App Router | Official Vercel stack, SSR/SSG patterns |
| `@supabase/supabase-js` | 2.x | Supabase client | Official SDK |
| `@supabase/ssr` | 0.5.x | SSR auth utilities | Required for App Router cookie-based auth |
| `tailwindcss` | 3.4.x or 4.x | Utility CSS | shadcn/ui foundation |
| `next-themes` | 0.4.x | Theme management | shadcn/ui recommended, handles hydration |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-markdown` | 9.x+ | Markdown to React | Rendering report content |
| `remark-gfm` | 4.x | GFM support (tables, strikethrough) | Tables in reports |
| `rehype-highlight` | 7.x | Syntax highlighting | If reports contain code blocks |
| `reading-time` | 1.5.x | Reading time estimation | DISP-03 requirement |
| `use-debounce` | 10.x | Debounced search | Client-side search filtering |
| `lucide-react` | 0.400+ | Icons | UI elements, theme toggle |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-markdown` | `@mdx-js/mdx` | MDX is overkill for rendering stored markdown; react-markdown simpler |
| `rehype-highlight` | `shiki` or `rehype-pretty-code` | shiki is more powerful but heavier; highlight.js sufficient for occasional code |
| `use-debounce` | Custom debounce | Library handles edge cases, 1.5KB gzipped |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr next-themes react-markdown remark-gfm rehype-highlight reading-time use-debounce lucide-react
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout with ThemeProvider, fonts
│   ├── page.tsx             # Home page (latest report or hero CTA)
│   ├── archive/
│   │   └── page.tsx         # Archive with search/filter
│   └── report/
│       └── [slug]/
│           └── page.tsx     # Report detail page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── providers/
│   │   └── theme-provider.tsx
│   ├── report/
│   │   ├── report-content.tsx    # Markdown renderer
│   │   ├── report-toc.tsx        # Table of contents sidebar
│   │   └── report-metadata.tsx   # Date, reading time, category
│   └── archive/
│       ├── archive-grid.tsx
│       ├── search-input.tsx
│       └── category-filter.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── middleware.ts    # Session refresh helper
│   └── utils/
│       ├── reading-time.ts
│       └── format-date.ts
└── styles/
    └── globals.css          # CSS variables, custom prose styles
```

### Pattern 1: Supabase Client Separation

**What:** Separate client utilities for browser and server contexts
**When to use:** Always with Next.js App Router + Supabase
**Example:**
```typescript
// lib/supabase/client.ts (Browser)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// lib/supabase/server.ts (Server Components, Route Handlers)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - can't set cookies
          }
        },
      },
    }
  )
}
```
Source: [Supabase SSR Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pattern 2: Middleware for Session Refresh

**What:** Refresh auth tokens on every request to prevent stale sessions
**When to use:** Any Supabase auth with App Router
**Example:**
```typescript
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```
Source: [Supabase Auth Server-Side Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pattern 3: Dark Mode with next-themes

**What:** Theme management with hydration-safe dark mode
**When to use:** Dark mode first sites with shadcn/ui
**Example:**
```typescript
// components/providers/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```
Source: [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode/next)

### Pattern 4: Custom Markdown Components

**What:** Styled markdown rendering with custom React components
**When to use:** Editorial content with specific typography requirements
**Example:**
```typescript
// components/report/report-content.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  h1: ({ children }) => (
    <h1 className="font-playfair text-4xl font-bold text-foreground mb-6 mt-10">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      id={props.id}
      className="font-playfair text-2xl font-semibold text-foreground mb-4 mt-8"
    >
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="font-serif text-lg leading-relaxed text-foreground/90 mb-4">
      {children}
    </p>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border/50 px-4 py-2 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/30 px-4 py-2 text-foreground/80">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 my-6 italic text-foreground/70">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline underline-offset-2"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
}

export function ReportContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
```
Source: [react-markdown GitHub](https://github.com/remarkjs/react-markdown)

### Pattern 5: Client-Side Search with URL State

**What:** Debounced search that syncs with URL for shareability
**When to use:** Archive search/filter functionality
**Example:**
```typescript
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

export function SearchInput() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    replace(`${pathname}?${params.toString()}`)
  }, 300)

  return (
    <input
      type="text"
      placeholder="Search reports..."
      defaultValue={searchParams.get('q') ?? ''}
      onChange={(e) => handleSearch(e.target.value)}
      className="..."
    />
  )
}
```
Source: [Next.js Search Tutorial](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)

### Anti-Patterns to Avoid

- **Using `getSession()` on server:** Always use `getUser()` for server-side auth verification - `getSession()` doesn't validate the JWT
- **Enabling RLS without policies:** Creates inaccessible data; always create at least one policy after enabling RLS
- **Version mismatch react-markdown/remark-gfm:** Use react-markdown 9.x with remark-gfm 4.x; mixing versions causes "inTable" errors
- **Hardcoding colors instead of CSS variables:** Makes theme changes difficult; always use semantic tokens like `bg-background`, `text-foreground`
- **Storing auth tokens in localStorage with SSR:** Use cookies via @supabase/ssr for proper server-side auth

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading time estimation | Word count / 200 | `reading-time` package | Handles edge cases, proven formula |
| Debounced search | Custom setTimeout | `use-debounce` | Cleanup, memory leaks, edge cases |
| Theme persistence | localStorage + state | `next-themes` | Handles hydration, flash prevention |
| Markdown tables | Custom parser | `remark-gfm` | GFM spec compliance |
| Date formatting | String manipulation | `date-fns` or Intl API | Localization, edge cases |
| Supabase auth cookies | Manual cookie handling | `@supabase/ssr` | Handles token refresh, cookie management |

**Key insight:** Every "simple" feature in the list above has 5-10 edge cases that libraries have already solved. The reading-time package handles markdown stripping, code blocks, and language-specific WPM. next-themes handles hydration mismatches that cause flickering. Rolling custom solutions wastes time on solved problems.

## Common Pitfalls

### Pitfall 1: RLS Without Policies

**What goes wrong:** Data becomes completely inaccessible via API after enabling RLS
**Why it happens:** RLS defaults to "deny all" when enabled without policies
**How to avoid:** Always create at least a SELECT policy immediately after enabling RLS
**Warning signs:** Empty arrays returned from queries that should have data

```sql
-- Always pair RLS enable with at least one policy
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published reports"
ON reports FOR SELECT
TO anon
USING (status = 'published');
```

### Pitfall 2: next-themes Hydration Mismatch

**What goes wrong:** Flash of wrong theme on page load, React hydration errors
**Why it happens:** Server renders with different theme than client
**How to avoid:** Add `suppressHydrationWarning` to html tag, set `disableTransitionOnChange`
**Warning signs:** Console warnings about hydration, visible theme flicker

### Pitfall 3: react-markdown Version Incompatibility

**What goes wrong:** "Cannot set properties of undefined (setting 'inTable')" error
**Why it happens:** Incompatible versions of react-markdown and remark-gfm
**How to avoid:** Use react-markdown 9.x with remark-gfm 4.x (check compatibility matrix)
**Warning signs:** Tables don't render, cryptic errors about undefined properties

### Pitfall 4: Supabase auth.uid() Null Comparison

**What goes wrong:** RLS policies silently fail for unauthenticated users
**Why it happens:** `null = user_id` is always false in SQL
**How to avoid:** Explicitly check `IS NOT NULL` or use appropriate role targeting
**Warning signs:** Policies that work for logged-in users fail silently for anon

```sql
-- Wrong: silently fails for anon
USING (auth.uid() = user_id)

-- Right: explicit null handling or role-specific policy
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
-- Or use TO authenticated to only apply to logged-in users
```

### Pitfall 5: Middleware Cookie Handling in Server Components

**What goes wrong:** Cookies can't be written from Server Components
**Why it happens:** Server Components are read-only for cookies
**How to avoid:** Use try/catch in cookie setAll, let middleware handle writes
**Warning signs:** Auth state not persisting between requests

## Code Examples

Verified patterns from official sources:

### Database Schema for Reports

```sql
-- Categories table for rotation schedule
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  word_count INT,
  reading_time INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Topic history to prevent repetition
CREATE TABLE topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_history ENABLE ROW LEVEL SECURITY;

-- Public read for published reports
CREATE POLICY "Public can read published reports"
ON reports FOR SELECT TO anon
USING (status = 'published');

-- Public read for categories
CREATE POLICY "Public can read categories"
ON categories FOR SELECT TO anon
USING (true);

-- Topic history is internal only (no anon access)
-- Admin policies will be added in Phase 2

-- Indexes for performance
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_published_at ON reports(published_at DESC);
CREATE INDEX idx_reports_category ON reports(category_id);
CREATE INDEX idx_reports_slug ON reports(slug);
```

### CSS Variables for Dark Theme

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode (fallback, not primary) */
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 43 74% 59%; /* Gold #C9A962 */
    --primary-foreground: 0 0% 9%;
    /* ... other light values */
  }

  .dark {
    /* Dark mode (primary) */
    --background: 0 0% 6.7%; /* #111111 soft dark */
    --foreground: 0 0% 95%;
    --primary: 43 74% 59%; /* Gold #C9A962 */
    --primary-foreground: 0 0% 9%;
    --card: 0 0% 8%;
    --card-foreground: 0 0% 95%;
    --border: 0 0% 14.9%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
  }
}
```

### Font Setup with next/font

```typescript
// app/layout.tsx
import { Playfair_Display, Source_Sans_3 } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${sourceSans.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
    },
  },
}
```

### Reading Time Calculation

```typescript
// lib/utils/reading-time.ts
import readingTime from 'reading-time'

export function calculateReadingTime(content: string): number {
  const stats = readingTime(content)
  return Math.ceil(stats.minutes)
}

// Usage in data layer
const wordCount = content.split(/\s+/).length
const readingTimeMinutes = calculateReadingTime(content)
```

### Sticky Table of Contents with Intersection Observer

```typescript
// components/report/report-toc.tsx
'use client'

import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0% -35% 0px' }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings])

  return (
    <nav className="sticky top-24 hidden lg:block">
      <h3 className="font-semibold text-foreground mb-4">Contents</h3>
      <ul className="space-y-2">
        {headings.map(({ id, text, level }) => (
          <li
            key={id}
            style={{ paddingLeft: `${(level - 2) * 12}px` }}
          >
            <a
              href={`#${id}`}
              className={`text-sm transition-colors ${
                activeId === id
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```
Source: [React Table of Contents Tutorial](https://www.emgoto.com/react-table-of-contents/)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Universal SSR package, simpler API |
| Tailwind v3 HSL colors | Tailwind v4 OKLCH colors | 2025 | Better color interpolation, shadcn/ui updated |
| `getSession()` server-side | `getUser()` server-side | 2024 | Security: getSession doesn't validate JWT |
| Font loading with `<link>` | `next/font` | Next.js 13 | Zero layout shift, self-hosted |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`, migration guide available
- react-markdown 8.x with remark-gfm 3.x: Compatibility issues, upgrade to 9.x/4.x

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal WPM for reading time**
   - What we know: Medium uses 265, Dev.to uses 275, general range is 200-275
   - What's unclear: Best value for investigative journalism content (3500+ words)
   - Recommendation: Use 250 WPM (middle ground), can adjust based on user feedback

2. **Exact dark mode palette**
   - What we know: User specified soft dark (#111-#1a1a1a), gold accent (#C9A962)
   - What's unclear: Full semantic color palette (muted, border, etc.)
   - Recommendation: Build on shadcn/ui dark defaults, adjust --background to #111111

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS setup, policies, helper functions
- [Supabase SSR Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs) - Client setup, middleware
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) - CSS variables, color system
- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode/next) - next-themes setup
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) - Component customization, plugins
- [Next.js Fonts](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) - next/font setup

### Secondary (MEDIUM confidence)
- [Next.js Search Tutorial](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - URL-based search pattern
- [LogRocket TOC Tutorial](https://blog.logrocket.com/create-table-contents-highlighting-react/) - Intersection Observer pattern
- [reading-time npm](https://www.npmjs.com/package/reading-time) - Reading time calculation

### Tertiary (LOW confidence)
- Various Medium/Dev.to articles for ecosystem patterns - cross-verified with official docs where possible

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official documentation, mature ecosystem
- Architecture: HIGH - Patterns from official Supabase/Next.js/shadcn docs
- Pitfalls: HIGH - Documented in official guides with explicit warnings
- TOC pattern: MEDIUM - Community pattern, well-established but not official

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable ecosystem)
