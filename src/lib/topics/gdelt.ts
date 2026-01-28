/**
 * GDELT DOC 2.0 API Client
 * Fetches news articles with entity and sentiment data
 * Free API - no auth required
 */

import { GDELTArticle } from './types';

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

// Cache for GDELT responses (30 min TTL)
const gdeltCache: Map<string, { data: GDELTArticle[]; timestamp: number }> = new Map();
const GDELT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface GDELTDocResponse {
  articles?: Array<{
    url: string;
    title: string;
    seendate: string;
    domain: string;
    language: string;
    sourcecountry: string;
    tone: string;
    // Additional fields that may be present
    socialimage?: string;
  }>;
}

/**
 * Parse GDELT's timespan format
 * @param timespan e.g., "12h", "24h", "7d"
 */
function parseTimespan(timespan: string): number {
  const match = timespan.match(/^(\d+)([hd])$/);
  if (!match) return 24; // Default 24 hours

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === 'd') return value * 24;
  return value;
}

/**
 * Build search query from keywords
 */
function buildSearchQuery(keywords: string[]): string {
  // Clean and quote multi-word phrases
  const cleanedKeywords = keywords.map(k => {
    const cleaned = k.trim().replace(/"/g, '');
    // Quote phrases with spaces
    if (cleaned.includes(' ')) {
      return `"${cleaned}"`;
    }
    return cleaned;
  });

  // Join with OR for broader matching
  return cleanedKeywords.join(' OR ');
}

/**
 * Query GDELT DOC API for articles matching keywords
 * @param keywords Search terms
 * @param timespan Time window (e.g., "12h", "24h")
 * @returns Array of GDELT articles
 */
export async function queryGDELT(
  keywords: string[],
  timespan: string = '24h'
): Promise<GDELTArticle[]> {
  const cacheKey = `${keywords.sort().join('|')}:${timespan}`;

  // Check cache
  const cached = gdeltCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GDELT_CACHE_TTL) {
    console.log(`[GDELT] Cache hit for: ${keywords.join(', ')}`);
    return cached.data;
  }

  const searchQuery = buildSearchQuery(keywords);
  const hours = parseTimespan(timespan);

  // Build GDELT DOC API URL
  const params = new URLSearchParams({
    query: searchQuery,
    mode: 'artlist',
    maxrecords: '100',
    format: 'json',
    timespan: `${hours}h`,
    sort: 'datedesc',
  });

  const url = `${GDELT_DOC_API}?${params.toString()}`;

  console.log(`[GDELT] Querying: ${keywords.join(', ')} (${timespan})`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[GDELT] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data: GDELTDocResponse = await response.json();

    if (!data.articles || data.articles.length === 0) {
      console.log(`[GDELT] No articles found for: ${keywords.join(', ')}`);
      return [];
    }

    // Transform to our GDELTArticle format
    const articles: GDELTArticle[] = data.articles.map(article => ({
      url: article.url,
      title: article.title,
      seenDate: article.seendate,
      domain: article.domain,
      language: article.language || 'en',
      sourcecountry: article.sourcecountry || 'unknown',
      tone: parseFloat(article.tone?.split(',')[0] || '0'), // GDELT tone format: "avg,pos,neg,polarity,..."
    }));

    console.log(`[GDELT] Found ${articles.length} articles`);

    // Cache the result
    gdeltCache.set(cacheKey, { data: articles, timestamp: Date.now() });

    return articles;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        console.error(`[GDELT] Request timeout for: ${keywords.join(', ')}`);
      } else {
        console.error(`[GDELT] Error: ${error.message}`);
      }
    }
    return [];
  }
}

/**
 * Query GDELT for velocity comparison (recent vs previous period)
 * @param keywords Search terms
 * @returns Object with recent and previous counts
 */
export async function queryGDELTVelocity(
  keywords: string[]
): Promise<{ recent12h: number; previous12h: number }> {
  // Query last 24h and split by time
  const articles = await queryGDELT(keywords, '24h');

  const now = Date.now();
  const twelveHoursAgo = now - 12 * 60 * 60 * 1000;

  let recent12h = 0;
  let previous12h = 0;

  for (const article of articles) {
    // Parse GDELT date format: "YYYYMMDDHHMMSS"
    const dateStr = article.seenDate;
    if (dateStr && dateStr.length >= 14) {
      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(4, 6), 10) - 1;
      const day = parseInt(dateStr.slice(6, 8), 10);
      const hour = parseInt(dateStr.slice(8, 10), 10);
      const minute = parseInt(dateStr.slice(10, 12), 10);

      const articleTime = new Date(year, month, day, hour, minute).getTime();

      if (articleTime > twelveHoursAgo) {
        recent12h++;
      } else {
        previous12h++;
      }
    }
  }

  return { recent12h, previous12h };
}

/**
 * Extract unique entities from GDELT articles
 * Since DOC API doesn't include GKG entities, we extract from titles/domains
 */
export function extractEntitiesFromArticles(articles: GDELTArticle[]): string[] {
  const entities = new Set<string>();

  // Named entity patterns
  const entityPatterns = [
    // Countries and regions
    /\b(United States|USA|US|America|China|Russia|Ukraine|Israel|Palestine|Gaza|Iran|North Korea|South Korea|Taiwan|India|Pakistan|UK|Britain|France|Germany|Japan|Brazil|Mexico|Canada|Australia|Saudi Arabia|Turkey|Egypt|Syria|Venezuela|Argentina|EU|European Union)\b/gi,
    // Organizations
    /\b(UN|NATO|WHO|IMF|World Bank|Fed|Federal Reserve|Congress|Senate|Pentagon|CIA|FBI|DOJ|Supreme Court|OPEC|WTO|G7|G20|BRICS)\b/gi,
    // Tech companies
    /\b(OpenAI|Google|Microsoft|Apple|Amazon|Meta|Facebook|Tesla|Nvidia|SpaceX|Twitter|TikTok|ByteDance|Samsung|Intel|AMD|Anthropic|DeepMind)\b/gi,
    // Notable people
    /\b(Trump|Biden|Putin|Xi Jinping|Zelensky|Netanyahu|Musk|Bezos|Zuckerberg|Altman)\b/gi,
    // Capitalized proper nouns (2+ words)
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
  ];

  for (const article of articles) {
    for (const pattern of entityPatterns) {
      const matches = article.title.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.add(match.trim().toLowerCase());
        }
      }
    }
  }

  return Array.from(entities);
}

/**
 * Clear GDELT cache (useful for forcing refresh)
 */
export function clearGDELTCache(): void {
  gdeltCache.clear();
}
