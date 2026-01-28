/**
 * Topic Discovery Types
 * For automated trending topic selection
 */

export interface RawHeadline {
  title: string;
  url: string;
  source: string;
  sourceTier: 1 | 2 | 3; // Quality tier
  publishedAt: Date;
  description?: string;
  score?: number; // For HackerNews, Reddit
}

/**
 * Meat-Score Components
 * M = α(E × Vv) + β(Svar × L)
 */
export interface MeatScoreComponents {
  entityDensity: number;      // E - unique entities / article count
  velocity: number;           // Vv - mention volume change over 12h
  sentimentVariance: number;  // Svar - std dev of sentiment across sources
  linkage: number;            // L - unique referring sources
  meatScore: number;          // M = α(E × Vv) + β(Svar × L)
}

export interface TopicCluster {
  topic: string; // Normalized topic name
  keywords: string[]; // Keywords that formed this cluster
  headlines: RawHeadline[];
  sourceCount: number; // Unique sources
  sources: string[]; // Source names
  firstSeen: Date;
  latestSeen: Date;
  hotnessScore: number;
  qualityScore: number; // Sum of source tier weights
  velocity: number; // Mentions per hour
  meatScore?: MeatScoreComponents; // GDELT-enriched scoring
}

export interface TrendingTopic {
  topic: string;
  hotnessScore: number;
  sourceCount: number;
  sources: string[];
  firstSeenHoursAgo: number;
  sampleHeadlines: string[];
  category: string;
  // Meat-Score fields (optional - only when GDELT enrichment available)
  meatScore?: number;
  entityDensity?: number;
  sentimentVariance?: number;
}

export interface SourceConfig {
  name: string;
  tier: 1 | 2 | 3;
  type: 'rss' | 'api' | 'hackernews' | 'reddit';
  url: string;
  categories: string[]; // Which categories this source is relevant for
}

/**
 * GDELT Article from DOC API
 */
export interface GDELTArticle {
  url: string;
  title: string;
  seenDate: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;           // -100 to +100 sentiment
  // GKG enrichments when available
  persons?: string[];
  organizations?: string[];
  locations?: string[];
  themes?: string[];
}

export interface AggregationResult {
  category: string;
  fetchedAt: Date;
  totalHeadlines: number;
  clusters: TopicCluster[];
  selectedTopic: TrendingTopic | null;
}
