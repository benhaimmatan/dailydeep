export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-playfair text-5xl md:text-6xl text-primary mb-4">
        The Daily Deep
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl max-w-2xl text-center">
        Premium AI-powered investigative reports published daily
      </p>
      <div className="mt-8 flex gap-4">
        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
          Get Started
        </button>
        <button className="border border-border px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors">
          Learn More
        </button>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="font-serif text-xl text-foreground mb-2">In-Depth Analysis</h3>
          <p className="text-muted-foreground text-sm">
            3,500+ word investigative reports with specific data points and citations.
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="font-serif text-xl text-foreground mb-2">Daily Topics</h3>
          <p className="text-muted-foreground text-sm">
            Seven rotating categories covering geopolitics, economics, technology, and more.
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="font-serif text-xl text-foreground mb-2">Premium Quality</h3>
          <p className="text-muted-foreground text-sm">
            Editorial-grade content with the depth of The Atlantic and NYT.
          </p>
        </div>
      </div>
    </main>
  )
}
