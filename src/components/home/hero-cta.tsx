import Link from 'next/link'

/**
 * Hero CTA displayed when no published reports exist
 * Centered branding with elegant editorial aesthetic
 */
export function HeroCTA() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl text-primary mb-6">
        The Daily Deep
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-8">
        Premium AI-powered investigative reports published daily
      </p>
      <p className="text-muted-foreground/70 text-sm max-w-xl mb-8">
        In-depth analysis covering geopolitics, economics, technology, climate,
        and more. Each report features specific data points, historical context,
        and cited sources.
      </p>
      <Link
        href="/archive"
        className="border border-border px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
      >
        Browse Archive
      </Link>
    </div>
  )
}
