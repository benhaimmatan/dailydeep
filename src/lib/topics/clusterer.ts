/**
 * Topic Clusterer
 * Groups similar headlines into topic clusters
 */

import { RawHeadline, TopicCluster } from './types';
import { TIER_WEIGHTS } from './sources';

// Common words to ignore when extracting keywords
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'new', 'says', 'said',
  'report', 'reports', 'after', 'before', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'about', 'into', 'through', 'during', 'above', 'below',
  'between', 'up', 'down', 'out', 'off', 'why', 'how', 'first', 'last', 'latest',
  'breaking', 'live', 'update', 'updates', 'news', 'today', 'yesterday', 'week',
]);

// Named entity patterns (countries, organizations, etc.)
const ENTITY_PATTERNS = [
  // Countries
  /\b(United States|USA|US|America|China|Russia|Ukraine|Israel|Palestine|Gaza|Iran|North Korea|South Korea|Taiwan|India|Pakistan|UK|Britain|France|Germany|Japan|Brazil|Mexico|Canada|Australia|Saudi Arabia|Turkey|Egypt|Syria|Venezuela|Argentina)\b/gi,
  // Organizations
  /\b(UN|NATO|EU|European Union|WHO|IMF|World Bank|Fed|Federal Reserve|Congress|Senate|Pentagon|CIA|FBI|NSA|DOJ|Supreme Court|White House|Kremlin|Beijing|OPEC|WTO|G7|G20|BRICS)\b/gi,
  // Tech companies
  /\b(OpenAI|Google|Microsoft|Apple|Amazon|Meta|Facebook|Tesla|Nvidia|SpaceX|Twitter|X Corp|TikTok|ByteDance|Samsung|Intel|AMD|Anthropic|DeepMind)\b/gi,
  // People patterns
  /\b(President|Prime Minister|CEO|PM)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
  /\b(Trump|Biden|Putin|Xi|Zelensky|Netanyahu|Musk|Bezos|Zuckerberg|Altman)\b/gi,
];

/**
 * Extract keywords and entities from a headline
 */
function extractKeywords(title: string): string[] {
  const keywords: string[] = [];

  // Extract named entities first
  for (const pattern of ENTITY_PATTERNS) {
    const matches = title.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase().trim()));
    }
  }

  // Extract remaining significant words
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word =>
      word.length >= 4 &&
      !STOP_WORDS.has(word) &&
      !/^\d+$/.test(word)
    );

  keywords.push(...words);

  // Dedupe and return
  return Array.from(new Set(keywords));
}

/**
 * Calculate similarity between two keyword sets
 */
function keywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  let intersection = 0;
  // Use array to avoid Set iteration downlevelIteration issue
  keywords1.forEach(word => {
    if (set2.has(word)) intersection++;
  });

  // Jaccard similarity
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Find or create a cluster for a headline
 */
function findMatchingCluster(
  headline: RawHeadline,
  keywords: string[],
  clusters: TopicCluster[],
  threshold = 0.25 // Lower threshold to catch related stories
): TopicCluster | null {
  let bestMatch: TopicCluster | null = null;
  let bestScore = 0;

  for (const cluster of clusters) {
    const similarity = keywordSimilarity(keywords, cluster.keywords);
    if (similarity >= threshold && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = cluster;
    }
  }

  return bestMatch;
}

/**
 * Generate a readable topic name from a cluster
 */
function generateTopicName(cluster: TopicCluster): string {
  // Count keyword frequency across headlines
  const keywordCounts = new Map<string, number>();

  for (const headline of cluster.headlines) {
    const words = extractKeywords(headline.title);
    for (const word of words) {
      keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
    }
  }

  // Get top keywords that appear in most headlines
  const sortedKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  // Try to form a coherent topic name
  // Prioritize named entities (capitalized in original)
  const topHeadline = cluster.headlines[0].title;

  // Extract the main subject from the most prominent headline
  // This is a simple heuristic - take first 6-8 significant words
  const significantWords = topHeadline
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 8)
    .join(' ');

  // If we have clear entities, use them
  if (sortedKeywords.length >= 2) {
    const entities = sortedKeywords
      .slice(0, 3)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Combine entity with context
    return entities.length > 30 ? entities.slice(0, 30) + '...' : entities;
  }

  return significantWords.length > 50
    ? significantWords.slice(0, 50) + '...'
    : significantWords;
}

/**
 * Cluster headlines into topic groups
 */
export function clusterHeadlines(headlines: RawHeadline[]): TopicCluster[] {
  const clusters: TopicCluster[] = [];

  // Filter to last 72 hours only
  const cutoffTime = Date.now() - 72 * 60 * 60 * 1000;
  const recentHeadlines = headlines.filter(h =>
    h.publishedAt.getTime() > cutoffTime
  );

  // Sort by quality (tier) then recency
  const sortedHeadlines = [...recentHeadlines].sort((a, b) => {
    if (a.sourceTier !== b.sourceTier) return a.sourceTier - b.sourceTier;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  // Process each headline
  for (const headline of sortedHeadlines) {
    const keywords = extractKeywords(headline.title);

    if (keywords.length < 2) continue; // Skip headlines with no meaningful keywords

    const matchingCluster = findMatchingCluster(headline, keywords, clusters);

    if (matchingCluster) {
      // Add to existing cluster
      matchingCluster.headlines.push(headline);
      matchingCluster.keywords = Array.from(new Set([...matchingCluster.keywords, ...keywords]));

      // Update cluster metadata
      if (!matchingCluster.sources.includes(headline.source)) {
        matchingCluster.sources.push(headline.source);
        matchingCluster.sourceCount++;
      }

      if (headline.publishedAt < matchingCluster.firstSeen) {
        matchingCluster.firstSeen = headline.publishedAt;
      }
      if (headline.publishedAt > matchingCluster.latestSeen) {
        matchingCluster.latestSeen = headline.publishedAt;
      }
    } else {
      // Create new cluster
      clusters.push({
        topic: headline.title, // Will be refined later
        keywords,
        headlines: [headline],
        sourceCount: 1,
        sources: [headline.source],
        firstSeen: headline.publishedAt,
        latestSeen: headline.publishedAt,
        hotnessScore: 0,
        qualityScore: 0,
        velocity: 0,
      });
    }
  }

  // Refine topic names and filter small clusters
  const significantClusters = clusters
    .filter(c => c.sourceCount >= 2) // Require at least 2 different sources
    .map(cluster => ({
      ...cluster,
      topic: generateTopicName(cluster),
    }));

  return significantClusters;
}

/**
 * Calculate hotness score for a cluster
 */
export function calculateHotnessScore(cluster: TopicCluster): number {
  const now = Date.now();

  // 1. Source diversity (0-100 points)
  // More unique sources = more important story
  const sourceDiversityScore = Math.min(cluster.sourceCount * 15, 100);

  // 2. Quality weight (0-100 points)
  // Higher tier sources = more authoritative
  let qualityScore = 0;
  for (const headline of cluster.headlines) {
    qualityScore += TIER_WEIGHTS[headline.sourceTier] || 4;
  }
  qualityScore = Math.min(qualityScore, 100);

  // 3. Recency bonus (0-100 points)
  // Newer stories get higher scores
  const hoursOld = (now - cluster.latestSeen.getTime()) / (1000 * 60 * 60);
  let recencyScore = 0;
  if (hoursOld < 6) recencyScore = 100;
  else if (hoursOld < 12) recencyScore = 80;
  else if (hoursOld < 24) recencyScore = 60;
  else if (hoursOld < 48) recencyScore = 40;
  else recencyScore = 20;

  // 4. Velocity (0-100 points)
  // How fast is the story spreading?
  const timeSpanHours = Math.max(
    (cluster.latestSeen.getTime() - cluster.firstSeen.getTime()) / (1000 * 60 * 60),
    1
  );
  const velocity = cluster.headlines.length / timeSpanHours;
  const velocityScore = Math.min(velocity * 20, 100);

  // 5. Engagement score (0-50 points)
  // For sources with scores (HN, Reddit)
  let engagementScore = 0;
  for (const headline of cluster.headlines) {
    if (headline.score) {
      engagementScore += Math.min(headline.score / 100, 10);
    }
  }
  engagementScore = Math.min(engagementScore, 50);

  // Weighted combination
  const totalScore =
    sourceDiversityScore * 0.30 +
    qualityScore * 0.25 +
    recencyScore * 0.20 +
    velocityScore * 0.15 +
    engagementScore * 0.10;

  // Normalize to 0-1000 scale
  return Math.round(totalScore * 10);
}

/**
 * Score and rank all clusters
 */
export function rankClusters(clusters: TopicCluster[]): TopicCluster[] {
  // Calculate scores
  const scoredClusters = clusters.map(cluster => {
    const hotnessScore = calculateHotnessScore(cluster);
    const qualityScore = cluster.headlines.reduce(
      (sum, h) => sum + (TIER_WEIGHTS[h.sourceTier] || 4),
      0
    );
    const velocity = cluster.headlines.length /
      Math.max((cluster.latestSeen.getTime() - cluster.firstSeen.getTime()) / (1000 * 60 * 60), 1);

    return {
      ...cluster,
      hotnessScore,
      qualityScore,
      velocity,
    };
  });

  // Sort by hotness score descending
  return scoredClusters.sort((a, b) => b.hotnessScore - a.hotnessScore);
}
