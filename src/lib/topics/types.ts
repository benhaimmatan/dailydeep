/**
 * Topic Discovery Types
 * For automated trending topic selection
 */

export interface RawHeadline {
  title: string;
  url: string;
  source: string;
  sourceTier: 0 | 1 | 2 | 3; // Quality tier: 0 = Deep analysis, 1 = Premium, 2 = Quality, 3 = General
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

/**
 * Depth Score Components
 * Measures investigation-worthiness vs shallow popularity
 */
export interface DepthScoreComponents {
  systemicImpact: number;     // Affects economy, policy, large populations (0-1)
  controversy: number;        // Multiple stakeholders, debate (0-1)
  emergingPattern: number;    // Signals broader trend, paradigm shift (0-1)
  shallowPenalty: number;     // Penalty for product updates, patches (0-0.7)
  depthScore: number;         // Combined score (0-1000 scale)
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
  depthScore?: DepthScoreComponents; // Investigation-worthiness scoring
}

/**
 * Deep Research Plan for high-scoring topics (>850)
 * Entity-based research queries for Gemini 2.0/3
 */
export interface DeepResearchPlan {
  triggered: boolean;
  finalScore: number;
  topic: string;
  category: string;
  entities: {
    primary: string[];      // Main entities to research (people, orgs, places)
    secondary: string[];    // Supporting entities
    techTerms: string[];    // Technical terminology
  };
  researchQueries: {
    factual: string[];      // What happened? Who is involved?
    contextual: string[];   // Why does this matter? Historical context?
    analytical: string[];   // What are the implications? Competing perspectives?
  };
  suggestedSources: string[];
  timestamp: string;
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
  // Depth Score fields (optional - investigation-worthiness)
  depthScore?: number;
  isShallow?: boolean;
  // Deep Research fields (optional - triggered when finalScore > 850)
  deepResearch?: DeepResearchPlan;
}

export interface SourceConfig {
  name: string;
  tier: 0 | 1 | 2 | 3; // 0 = Deep analysis, 1 = Premium, 2 = Quality, 3 = General
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
