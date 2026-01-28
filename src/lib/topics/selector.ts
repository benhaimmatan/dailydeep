/**
 * Topic Selector
 * Main entry point for automated topic selection
 * Aggregates sources, clusters headlines, scores topics, and auto-selects the best one
 */

import { TrendingTopic, AggregationResult } from './types';
import { getSourcesForCategory } from './sources';
import { fetchAllSources } from './fetchers';
import { clusterHeadlines, rankClusters } from './clusterer';
import { SupabaseClient } from '@supabase/supabase-js';

// Minimum hotness score to be considered a valid trending topic
const MINIMUM_HOTNESS_THRESHOLD = 150;

// Cache for topic aggregation (avoid hammering sources)
const topicCache: Map<string, { result: AggregationResult; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

  // 4. Score and rank clusters
  console.log('\n📈 Scoring clusters...');
  const rankedClusters = rankClusters(clusters);

  // 5. Get used topics (if supabase provided)
  let usedTopics: string[] = [];
  if (supabase) {
    usedTopics = await getUsedTopics(supabase);
    console.log(`Found ${usedTopics.length} recently used topics`);
  }

  // 6. Filter out used topics and select best
  const availableClusters = rankedClusters.filter(
    c => !isTopicUsed(c.topic, usedTopics)
  );

  console.log(`\n🏆 Top 5 trending topics:`);
  availableClusters.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. [${c.hotnessScore}] ${c.topic} (${c.sourceCount} sources)`);
  });

  // 7. Auto-select the best topic
  let selectedTopic: TrendingTopic | null = null;

  const bestCluster = availableClusters[0];
  if (bestCluster && bestCluster.hotnessScore >= MINIMUM_HOTNESS_THRESHOLD) {
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
    };
    console.log(`\n✅ Selected: "${selectedTopic.topic}" (score: ${selectedTopic.hotnessScore})`);
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
    clusters: rankedClusters.slice(0, 10), // Keep top 10 for reference
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

  // Convert clusters to trending topics
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
    }));
}

/**
 * Clear the topic cache (useful for forcing refresh)
 */
export function clearTopicCache(): void {
  topicCache.clear();
}
