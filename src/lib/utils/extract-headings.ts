/**
 * Heading extracted from markdown for table of contents
 */
export interface Heading {
  id: string
  text: string
  level: number
}

/**
 * Generate a URL-safe slug from heading text
 * @param text - The heading text to slugify
 * @returns Lowercase, hyphenated slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim()
}

/**
 * Extract h2 and h3 headings from markdown content
 * @param markdown - Raw markdown content
 * @returns Array of headings with id, text, and level
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []

  // Match ## and ### headings (h2 and h3)
  const headingRegex = /^(#{2,3})\s+(.+)$/gm

  let match
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length // 2 for ##, 3 for ###
    const text = match[2].trim()
    const id = slugify(text)

    headings.push({ id, text, level })
  }

  return headings
}
