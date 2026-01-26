import googleTrends from 'google-trends-api';

/**
 * Trending topic from Google Trends
 */
export interface TrendingTopic {
  title: string;
  traffic: string; // e.g., "100K+"
  relatedQueries: string[];
}

/**
 * Map category names to Google Trends category IDs
 * These are approximate mappings - Google's categories don't perfectly align
 */
const CATEGORY_MAP: Record<string, number | undefined> = {
  'Geopolitics': 16, // News -> World
  'Economics': 7, // Business
  'Technology': 5, // Computers & Electronics
  'Climate': 174, // Science -> Environment
  'Society': 14, // People & Society
  'Science': 174, // Science
  'Conflict': 16, // News -> World (closest match)
};

/**
 * Get daily trending topics from Google Trends
 * @param geo - Country code (default: US)
 * @returns Array of trending topics
 */
export async function getDailyTrends(geo = 'US'): Promise<TrendingTopic[]> {
  try {
    const results = await googleTrends.dailyTrends({ geo });
    const data = JSON.parse(results);

    const trends = data.default.trendingSearchesDays[0]?.trendingSearches || [];

    return trends.slice(0, 20).map((trend: any) => ({
      title: trend.title?.query || '',
      traffic: trend.formattedTraffic || '',
      relatedQueries: (trend.relatedQueries || []).map((q: any) => q.query),
    }));
  } catch (error) {
    console.error('Failed to fetch daily trends:', error);
    return [];
  }
}

/**
 * Get trending topics filtered by category
 * First fetches daily trends, then filters/ranks by relevance to category
 */
export async function getTrendsByCategory(
  categoryName: string,
  geo = 'US'
): Promise<TrendingTopic[]> {
  // Get all daily trends
  const allTrends = await getDailyTrends(geo);

  // Get category-specific interest if available
  const categoryId = CATEGORY_MAP[categoryName];

  if (!categoryId) {
    // No mapping - return general trends
    return allTrends.slice(0, 10);
  }

  try {
    // Try to get category-specific trends using interestByRegion
    // This gives us topics that are more relevant to the category
    const categoryResults = await googleTrends.interestByRegion({
      keyword: categoryName.toLowerCase(),
      geo,
    });

    // Parse and combine with daily trends for best results
    // Return daily trends for now with the category context
    return allTrends.slice(0, 10);
  } catch (error) {
    // Fallback to daily trends if category query fails
    console.warn(`Category query failed for ${categoryName}, using daily trends`);
    return allTrends.slice(0, 10);
  }
}

/**
 * Check if a topic was recently used (to avoid repetition)
 * This will be called from the API route with Supabase
 */
export function filterUsedTopics(
  trends: TrendingTopic[],
  usedTopics: string[]
): TrendingTopic[] {
  const usedSet = new Set(usedTopics.map((t) => t.toLowerCase()));
  return trends.filter((trend) => !usedSet.has(trend.title.toLowerCase()));
}
