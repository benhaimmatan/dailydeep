/**
 * Source Fetchers
 * Fetch headlines from various sources (RSS, APIs, HackerNews, Reddit)
 */

import { RawHeadline, SourceConfig } from './types';

// Simple XML parser for RSS (no external dependency)
function parseRSSXml(xml: string, source: SourceConfig): RawHeadline[] {
  const headlines: RawHeadline[] = [];

  // Extract items using regex (lightweight, no dependency)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
  const linkRegex = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i;
  const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/i;
  const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = titleRegex.exec(item);
    const linkMatch = linkRegex.exec(item);
    const pubDateMatch = pubDateRegex.exec(item);
    const descMatch = descRegex.exec(item);

    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1]
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();

      if (title && title.length > 10) {
        headlines.push({
          title,
          url: linkMatch?.[1]?.trim() || '',
          source: source.name,
          sourceTier: source.tier,
          publishedAt: pubDateMatch?.[1] ? new Date(pubDateMatch[1]) : new Date(),
          description: descMatch?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 200),
        });
      }
    }
  }

  return headlines.slice(0, 30); // Limit per source
}

/**
 * Fetch RSS feed
 */
async function fetchRSS(source: SourceConfig): Promise<RawHeadline[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'TheDailyDeep/1.0 (News Aggregator)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.warn(`RSS fetch failed for ${source.name}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSSXml(xml, source);
  } catch (error) {
    console.error(`RSS fetch error for ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch from NewsAPI Mirror (saurav.tech)
 */
async function fetchNewsAPIMirror(source: SourceConfig): Promise<RawHeadline[]> {
  try {
    const response = await fetch(source.url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn(`NewsAPI fetch failed for ${source.name}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const articles = data.articles || [];

    return articles.slice(0, 30).map((article: {
      title?: string;
      url?: string;
      source?: { name?: string };
      publishedAt?: string;
      description?: string;
    }) => ({
      title: article.title || '',
      url: article.url || '',
      source: article.source?.name || source.name,
      sourceTier: source.tier,
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
      description: article.description?.slice(0, 200),
    })).filter((h: RawHeadline) => h.title && h.title.length > 10);
  } catch (error) {
    console.error(`NewsAPI fetch error for ${source.name}:`, error);
    return [];
  }
}

/**
 * Fetch from HackerNews API
 */
async function fetchHackerNews(source: SourceConfig): Promise<RawHeadline[]> {
  try {
    // Get top story IDs
    const idsResponse = await fetch(source.url, {
      next: { revalidate: 1800 }, // Cache for 30 min
    });

    if (!idsResponse.ok) return [];

    const storyIds: number[] = await idsResponse.json();
    const topIds = storyIds.slice(0, 30);

    // Fetch story details in parallel (limit to 15 for speed)
    const storyPromises = topIds.slice(0, 15).map(async (id) => {
      try {
        const res = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { next: { revalidate: 1800 } }
        );
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    });

    const stories = await Promise.all(storyPromises);

    return stories
      .filter((s): s is { title: string; url?: string; time: number; score: number } =>
        s && s.title && s.score >= 50 // Only stories with score >= 50
      )
      .map((story) => ({
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.time}`,
        source: 'HackerNews',
        sourceTier: source.tier,
        publishedAt: new Date(story.time * 1000),
        score: story.score,
      }));
  } catch (error) {
    console.error('HackerNews fetch error:', error);
    return [];
  }
}

/**
 * Fetch from Reddit API
 */
async function fetchReddit(source: SourceConfig): Promise<RawHeadline[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn(`Reddit fetch failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const posts = data.data?.children || [];

    return posts
      .filter((post: { data: { score: number; over_18: boolean } }) =>
        post.data.score >= 100 && !post.data.over_18
      )
      .slice(0, 20)
      .map((post: {
        data: {
          title: string;
          url: string;
          created_utc: number;
          score: number;
          subreddit: string;
        }
      }) => ({
        title: post.data.title,
        url: post.data.url,
        source: `Reddit r/${post.data.subreddit}`,
        sourceTier: source.tier,
        publishedAt: new Date(post.data.created_utc * 1000),
        score: post.data.score,
      }));
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return [];
  }
}

/**
 * Fetch headlines from a single source
 */
export async function fetchFromSource(source: SourceConfig): Promise<RawHeadline[]> {
  switch (source.type) {
    case 'rss':
      return fetchRSS(source);
    case 'api':
      return fetchNewsAPIMirror(source);
    case 'hackernews':
      return fetchHackerNews(source);
    case 'reddit':
      return fetchReddit(source);
    default:
      console.warn(`Unknown source type: ${source.type}`);
      return [];
  }
}

/**
 * Fetch from all sources for a category (parallel)
 */
export async function fetchAllSources(sources: SourceConfig[]): Promise<RawHeadline[]> {
  const results = await Promise.allSettled(
    sources.map(source => fetchFromSource(source))
  );

  const allHeadlines: RawHeadline[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✓ ${sources[index].name}: ${result.value.length} headlines`);
      allHeadlines.push(...result.value);
    } else {
      console.warn(`✗ ${sources[index].name}: ${result.reason}`);
    }
  });

  return allHeadlines;
}
