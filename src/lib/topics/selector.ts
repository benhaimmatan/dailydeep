/**
 * Topic Selector
 * Main entry point for automated topic selection
 * Aggregates sources, clusters headlines, scores topics, and auto-selects the best one
 * Now enhanced with GDELT enrichment and Meat-Score ranking
 */

import { TrendingTopic, AggregationResult, TopicCluster } from './types';
import { getSourcesForCategory } from './sources';
import { fetchAllSources } from './fetchers';
import { clusterHeadlines, rankClusters } from './clusterer';
import { queryGDELT, queryGDELTVelocity } from './gdelt';
import { calculateMeatScore, calculateMeatScoreFallback } from './meat-score';
import { SupabaseClient } from '@supabase/supabase-js';

// Minimum hotness score to be considered a valid trending topic
const MINIMUM_HOTNESS_THRESHOLD = 150;

// Minimum Meat-Score to be considered (when GDELT data is available)
const MINIMUM_MEAT_SCORE_THRESHOLD = 100;

// Cache for topic aggregation (avoid hammering sources)
const topicCache: Map<string, { result: AggregationResult; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Enrich top clusters with GDELT data and calculate Meat-Score
 * Only enriches top N clusters to minimize API calls
 */
async function enrichWithGDELT(
  clusters: TopicCluster[],
  maxEnrich: number = 5
): Promise<TopicCluster[]> {
  console.log(`\n🥩 Enriching top ${maxEnrich} clusters with GDELT data...`);

  const enrichedClusters: TopicCluster[] = [];

  // Process top clusters in parallel (batch of maxEnrich)
  const topClusters = clusters.slice(0, maxEnrich);
  const remainingClusters = clusters.slice(maxEnrich);

  const enrichmentPromises = topClusters.map(async (cluster) => {
    try {
      // Extract top keywords for GDELT query
      const searchKeywords = cluster.keywords.slice(0, 3);

      if (searchKeywords.length === 0) {
        console.log(`  [${cluster.topic.slice(0, 30)}...] No keywords, using fallback`);
        return {
          ...cluster,
          meatScore: calculateMeatScoreFallback(cluster),
        };
      }

      // Query GDELT for articles and velocity
      const [gdeltArticles, velocityData] = await Promise.all([
        queryGDELT(searchKeywords, '24h'),
        queryGDELTVelocity(searchKeywords),
      ]);

      // Calculate Meat-Score
      const meatScore = gdeltArticles.length > 0
        ? calculateMeatScore(cluster, gdeltArticles, velocityData)
        : calculateMeatScoreFallback(cluster);

      console.log(
        `  [${cluster.topic.slice(0, 30)}...] Meat-Score: ${meatScore.meatScore} ` +
        `(E:${meatScore.entityDensity} V:${meatScore.velocity} S:${meatScore.sentimentVariance} L:${meatScore.linkage})`
      );

      return {
        ...cluster,
        meatScore,
      };
    } catch {
      console.error(`  [${cluster.topic.slice(0, 30)}...] GDELT error, using fallback`);
      return {
        ...cluster,
        meatScore: calculateMeatScoreFallback(cluster),
      };
    }
  });

  const enrichedTop = await Promise.all(enrichmentPromises);
  enrichedClusters.push(...enrichedTop);

  // Add remaining clusters with fallback scores
  for (const cluster of remainingClusters) {
    enrichedClusters.push({
      ...cluster,
      meatScore: calculateMeatScoreFallback(cluster),
    });
  }

  // Re-sort by Meat-Score (primary) with hotness as tiebreaker
  enrichedClusters.sort((a, b) => {
    const meatA = a.meatScore?.meatScore ?? 0;
    const meatB = b.meatScore?.meatScore ?? 0;

    if (meatA !== meatB) return meatB - meatA;
    return b.hotnessScore - a.hotnessScore;
  });

  return enrichedClusters;
}

/**
 * Get topics used in the last N days (to avoid repetition)
 */
async function getUsedTopics(
  supabase: SupabaseClient,
  days: number = 30
): Promise<string[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data } = await supabase
    .from('topic_history')
    .select('topic')
    .gte('used_at', cutoffDate.toISOString());

  return (data || []).map((t) => t.topic.toLowerCase());
}

/**
 * Check if a topic is too similar to recently used topics
 */
function isTopicUsed(topic: string, usedTopics: string[]): boolean {
  const normalizedTopic = topic.toLowerCase();

  for (const used of usedTopics) {
    // Exact match
    if (normalizedTopic === used) return true;

    // Significant word overlap (>50% of words match)
    const topicWordsArray = normalizedTopic.split(/\s+/).filter(w => w.length > 3);
    const topicWords = new Set(topicWordsArray);
    const usedWords = new Set(used.split(/\s+/).filter(w => w.length > 3));

    if (topicWords.size === 0 || usedWords.size === 0) continue;

    let overlap = 0;
    topicWordsArray.forEach(word => {
      if (usedWords.has(word)) overlap++;
    });

    const overlapRatio = overlap / Math.min(topicWords.size, usedWords.size);
    if (overlapRatio > 0.5) return true;
  }

  return false;
}

/**
 * Generate a fallback topic when no trending topic meets threshold
 */
function generateFallbackTopic(category: string): string {
  const fallbacks: Record<string, string[]> = {
    Geopolitics: [
      'Current state of international diplomatic relations',
      'Global power dynamics and shifting alliances',
      'International security challenges and responses',
    ],
    Economics: [
      'Global economic trends and market analysis',
      'Central bank policies and their global impact',
      'Trade dynamics and economic outlook',
    ],
    Technology: [
      'Emerging technologies reshaping industries',
      'AI development and its societal implications',
      'Cybersecurity landscape and digital transformation',
    ],
    Climate: [
      'Climate change impacts and adaptation strategies',
      'Renewable energy transition progress',
      'Environmental policy developments worldwide',
    ],
    Society: [
      'Social trends shaping modern communities',
      'Demographic shifts and their implications',
      'Public health and social welfare developments',
    ],
    Science: [
      'Recent scientific breakthroughs and discoveries',
      'Space exploration and astronomical findings',
      'Medical research advances and health innovations',
    ],
    Conflict: [
      'Global conflict zones and peace efforts',
      'Security challenges and international responses',
      'Humanitarian situations in conflict areas',
    ],
  };

  const categoryFallbacks = fallbacks[category] || fallbacks['Geopolitics'];
  const randomIndex = Math.floor(Math.random() * categoryFallbacks.length);
  return categoryFallbacks[randomIndex];
}

/**
 * Aggregate trending topics for a category
 */
export async function aggregateTopics(
  category: string,
  supabase?: SupabaseClient
): Promise<AggregationResult> {
  // Check cache first
  const cached = topicCache.get(category);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`Using cached topics for ${category}`);
    return cached.result;
  }

  console.log(`\n📊 Aggregating topics for: ${category}`);
  console.log('─'.repeat(50));

  // 1. Get sources for this category
  const sources = getSourcesForCategory(category);
  console.log(`Found ${sources.length} sources for ${category}`);

  // 2. Fetch headlines from all sources (parallel)
  console.log('\n📡 Fetching headlines...');
  const headlines = await fetchAllSources(sources);
  console.log(`Total headlines fetched: ${headlines.length}`);

  // 3. Cluster similar headlines
  console.log('\n🔗 Clustering headlines...');
  const clusters = clusterHeadlines(headlines);
  console.log(`Formed ${clusters.length} topic clusters`);

  // 4. Score and rank clusters (initial hotness scoring)
  console.log('\n📈 Scoring clusters...');
  const rankedClusters = rankClusters(clusters);

  // 5. Enrich with GDELT and calculate Meat-Score
  const enrichedClusters = await enrichWithGDELT(rankedClusters, 5);

  // 6. Get used topics (if supabase provided)
  let usedTopics: string[] = [];
  if (supabase) {
    usedTopics = await getUsedTopics(supabase);
    console.log(`Found ${usedTopics.length} recently used topics`);
  }

  // 7. Filter out used topics and select best
  const availableClusters = enrichedClusters.filter(
    c => !isTopicUsed(c.topic, usedTopics)
  );

  console.log(`\n🏆 Top 5 trending topics (by Meat-Score):`);
  availableClusters.slice(0, 5).forEach((c, i) => {
    const meatEmoji = c.meatScore && c.meatScore.meatScore >= 150 ? '🥩' : '📰';
    console.log(
      `  ${i + 1}. ${meatEmoji} [M:${c.meatScore?.meatScore ?? 0} H:${c.hotnessScore}] ${c.topic} (${c.sourceCount} sources)`
    );
  });

  // 8. Auto-select the best topic (prefer Meat-Score, fallback to hotness)
  let selectedTopic: TrendingTopic | null = null;

  const bestCluster = availableClusters[0];
  const meetsThreshold =
    (bestCluster?.meatScore?.meatScore ?? 0) >= MINIMUM_MEAT_SCORE_THRESHOLD ||
    (bestCluster?.hotnessScore ?? 0) >= MINIMUM_HOTNESS_THRESHOLD;

  if (bestCluster && meetsThreshold) {
    selectedTopic = {
      topic: bestCluster.topic,
      hotnessScore: bestCluster.hotnessScore,
      sourceCount: bestCluster.sourceCount,
      sources: bestCluster.sources,
      firstSeenHoursAgo: Math.round(
        (Date.now() - bestCluster.firstSeen.getTime()) / (1000 * 60 * 60)
      ),
      sampleHeadlines: bestCluster.headlines.slice(0, 3).map(h => h.title),
      category,
      // Meat-Score fields
      meatScore: bestCluster.meatScore?.meatScore,
      entityDensity: bestCluster.meatScore?.entityDensity,
      sentimentVariance: bestCluster.meatScore?.sentimentVariance,
    };
    console.log(
      `\n✅ Selected: "${selectedTopic.topic}" ` +
      `(Meat-Score: ${selectedTopic.meatScore ?? 'N/A'}, Hotness: ${selectedTopic.hotnessScore})`
    );
  } else {
    // Use fallback
    const fallbackTopic = generateFallbackTopic(category);
    selectedTopic = {
      topic: fallbackTopic,
      hotnessScore: 0,
      sourceCount: 0,
      sources: [],
      firstSeenHoursAgo: 0,
      sampleHeadlines: [],
      category,
    };
    console.log(`\n⚠️ No trending topic met threshold. Using fallback: "${fallbackTopic}"`);
  }

  const result: AggregationResult = {
    category,
    fetchedAt: new Date(),
    totalHeadlines: headlines.length,
    clusters: enrichedClusters.slice(0, 10), // Keep top 10 for reference (now with Meat-Score)
    selectedTopic,
  };

  // Cache the result
  topicCache.set(category, { result, timestamp: Date.now() });

  return result;
}

/**
 * Auto-select the best topic for a category
 * This is the main entry point for cron and manual generation
 */
export async function autoSelectTopic(
  category: string,
  supabase: SupabaseClient
): Promise<string> {
  const result = await aggregateTopics(category, supabase);

  if (result.selectedTopic) {
    return result.selectedTopic.topic;
  }

  // Should never reach here, but just in case
  return generateFallbackTopic(category);
}

/**
 * Get trending topics for admin UI (for QA/manual selection)
 */
export async function getTrendingTopicsForAdmin(
  category: string,
  supabase: SupabaseClient
): Promise<TrendingTopic[]> {
  const result = await aggregateTopics(category, supabase);

  // Get used topics
  const usedTopics = await getUsedTopics(supabase);

  // Convert clusters to trending topics (with Meat-Score data)
  return result.clusters
    .filter(c => !isTopicUsed(c.topic, usedTopics))
    .slice(0, 10)
    .map(cluster => ({
      topic: cluster.topic,
      hotnessScore: cluster.hotnessScore,
      sourceCount: cluster.sourceCount,
      sources: cluster.sources,
      firstSeenHoursAgo: Math.round(
        (Date.now() - cluster.firstSeen.getTime()) / (1000 * 60 * 60)
      ),
      sampleHeadlines: cluster.headlines.slice(0, 3).map(h => h.title),
      category,
      // Meat-Score fields
      meatScore: cluster.meatScore?.meatScore,
      entityDensity: cluster.meatScore?.entityDensity,
      sentimentVariance: cluster.meatScore?.sentimentVariance,
    }));
}

/**
 * Clear the topic cache (useful for forcing refresh)
 */
export function clearTopicCache(): void {
  topicCache.clear();
}
