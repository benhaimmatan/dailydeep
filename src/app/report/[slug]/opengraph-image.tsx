import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const alt = 'The Daily Deep'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

/**
 * Load font from Google Fonts API for dynamic text rendering
 */
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

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Generate dynamic OG image for report pages
 * Uses report title, category, and branded styling
 */
export default async function Image({ params }: PageProps) {
  const { slug } = await params

  // Create Supabase client (server-side, no cookies needed for public data)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch report data with explicit typing for the query result
  const { data: report } = await supabase
    .from('reports')
    .select(`
      title,
      category:categories(name)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single<{ title: string; category: { name: string } | null }>()

  // Default values for fallback
  const title = report?.title || 'The Daily Deep'
  const categoryName = report?.category?.name || 'Investigative Report'

  // Load Playfair Display font for brand consistency
  let fontData: ArrayBuffer | undefined
  try {
    fontData = await loadGoogleFont('Playfair+Display:wght@700', title + categoryName)
  } catch {
    // Font loading failed, will use fallback system font
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          backgroundColor: '#111111',
        }}
      >
        {/* Category badge at top */}
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            fontWeight: 600,
            color: '#C9A962',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {categoryName}
        </div>

        {/* Report title in center */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            paddingTop: '40px',
            paddingBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: title.length > 80 ? 48 : title.length > 50 ? 56 : 64,
              fontFamily: fontData ? 'Playfair Display' : 'Georgia',
              fontWeight: 700,
              color: '#F2F2F2',
              lineHeight: 1.2,
              maxHeight: '360px',
              overflow: 'hidden',
            }}
          >
            {title.length > 120 ? title.slice(0, 117) + '...' : title}
          </div>
        </div>

        {/* Branding at bottom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              fontWeight: 700,
              color: '#C9A962',
              letterSpacing: '0.05em',
            }}
          >
            The Daily Deep
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: '#666666',
            }}
          >
            Premium Investigative Reports
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: 'Playfair Display',
              data: fontData,
              style: 'normal',
              weight: 700,
            },
          ]
        : undefined,
    }
  )
}
