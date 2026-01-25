import readingTime from 'reading-time'

/**
 * Calculate reading time in minutes for given content
 * @param content - The text content to analyze
 * @returns Reading time in minutes, rounded up to nearest minute
 */
export function calculateReadingTime(content: string): number {
  const result = readingTime(content)
  return Math.ceil(result.minutes)
}
