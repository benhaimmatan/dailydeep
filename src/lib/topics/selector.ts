/**
 * Topic Selector
 * Main entry point for automated topic selection
 * Aggregates sources, clusters headlines, scores topics, and auto-selects the best one
 * Now enhanced with GDELT enrichment and Meat-Score ranking
 */

import { TrendingTopic, AggregationResult, TopicCluster, DeepResearchPlan } from './types';
import { getSourcesForCategory } from './sources';
import { fetchAllSources } from './fetchers';
import { clusterHeadlines, rankClusters } from './clusterer';
import { queryGDELT, queryGDELTVelocity } from './gdelt';
import { calculateMeatScore, calculateMeatScoreFallback } from './meat-score';
import { calculateDepthScore, isShallowTopic, calculateNegativePenalty, calculateSemanticMeat } from './depth-score';
import { SupabaseClient } from '@supabase/supabase-js';

// Minimum hotness score to be considered a valid trending topic
const MINIMUM_HOTNESS_THRESHOLD = 150;

// Minimum Meat-Score to be considered (when GDELT data is available)
const MINIMUM_MEAT_SCORE_THRESHOLD = 100;

// Cache for topic aggregation (avoid hammering sources)
const topicCache: Map<string, { result: AggregationResult; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Time decay offset (hours) to prevent division by zero
const TIME_DECAY_OFFSET = 2;

// Dynamic Gravity by category (Half-Life Model)
// Lower gravity = slower decay (evergreen content stays relevant longer)
// Higher gravity = faster decay (breaking news needs to be fresh)
const CATEGORY_GRAVITY: Record<string, number> = {
  Science: 0.8,      // Evergreen - discoveries stay relevant
  Climate: 0.8,      // Evergreen - climate trends are slow-moving
  Technology: 1.2,   // Mixed - some evergreen, some breaking
  Economics: 1.5,    // Moderate - market news decays moderately
  Society: 1.2,      // Mixed - social trends vary
  Geopolitics: 1.8,  // Breaking - fast-moving diplomatic events
  Conflict: 1.8,     // Breaking - conflict situations change rapidly
};

// Virtual Seeding: Tier 0 sources get bonus samples to bypass Wilson penalty
const VIRTUAL_SEED_TIER_0 = 10; // n=10 virtual samples
const VIRTUAL_SEED_WINDOW_HOURS = 6; // Only for first 6 hours

// Deep Research threshold
// Deep Research threshold - triggers entity-based research plan for Gemini
// Lowered from 850 to 400 based on observed score ranges (13-136 typical)
const DEEP_RESEARCH_THRESHOLD = 400;

/**
 * Wilson score lower bound approximation for confidence adjustment
 * Penalizes low-sample clusters that may appear artificially confident
 * @param virtualSeed - Additional virtual samples (for Tier 0 sources)
 */
function confidenceAdjustedScore(score: number, sampleSize: number, virtualSeed: number = 0): number {
  const z = 1.96; // 95% confidence
  const n = Math.max(sampleSize + virtualSeed, 1);
  const p = score / 1000; // Normalize to 0-1

  // Wilson score lower bound approximation
  const denominator = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);

  return ((center - margin) / denominator) * 1000;
}

/**
 * Check if cluster has Tier 0 sources within the virtual seed window
 */
function calculateVirtualSeed(cluster: TopicCluster): number {
  // Check if any headline is from Tier 0 and within 6h window
  const sixHoursAgo = Date.now() - (VIRTUAL_SEED_WINDOW_HOURS * 60 * 60 * 1000);

  const hasTier0Recent = cluster.headlines.some(
    h => h.sourceTier === 0 && h.publishedAt.getTime() > sixHoursAgo
  );

  return hasTier0Recent ? VIRTUAL_SEED_TIER_0 : 0;
}

/**
 * Calculate combined score for ranking
 * BaseScore: 0.4 * SemanticMeat + 0.6 * EntityDepth
 * Applies: shallow penalty, negative signals, dynamic time decay, Wilson confidence
 */
function calculateCombinedScore(cluster: TopicCluster, category: string = 'Technology'): number {
  const meatScore = cluster.meatScore?.meatScore ?? 0;
  const depthScore = cluster.depthScore?.depthScore ?? 0;
  const shallowPenalty = cluster.depthScore?.shallowPenalty ?? 0;

  // Calculate SemanticMeat using MAX of individual headlines (not combined)
  // Combined text dilutes proper noun ratio; max preserves signal strength
  const headlineTexts = [cluster.topic, ...cluster.headlines.map(h => h.title)];
  const semanticMeatScores = headlineTexts.map(text => calculateSemanticMeat(text).semanticMeat);
  const maxSemanticMeat = Math.max(...semanticMeatScores);

  // 1. Base combined score: 0.4 * SemanticMeat + 0.6 * EntityDepth
  // SemanticMeat provides the "meat" (proper nouns + tech terms ratio)
  // depthScore provides the "depth" (systemic impact, controversy, patterns)
  const baseScore = 0.4 * maxSemanticMeat + 0.6 * depthScore;

  // Boost with meatScore if available (GDELT enrichment)
  const gdeltBoost = meatScore > 0 ? (meatScore / 1000) * 0.1 : 0; // Up to 10% boost
  const boostedScore = baseScore * (1 + gdeltBoost);

  // 2. Apply shallow penalty (reduces score by 50-70% for shallow topics)
  const afterShallowPenalty = boostedScore * (1 - shallowPenalty);

  // 3. Apply negative signal penalty (promotional, clickbait, listicles, pronominal gaps)
  const negativePenalty = calculateNegativePenalty(cluster.topic);
  const afterNegativePenalty = afterShallowPenalty * (1 - negativePenalty);

  // 4. Apply dynamic time decay based on category (Half-Life Model)
  const hoursOld = (Date.now() - cluster.latestSeen.getTime()) / (1000 * 60 * 60);
  const gravity = CATEGORY_GRAVITY[category] ?? 1.5;
  const timeDecay = 1 / Math.pow(hoursOld + TIME_DECAY_OFFSET, gravity / 3);
  // Min 50% retention to not completely kill older but important stories
  const afterTimeDecay = afterNegativePenalty * (0.5 + 0.5 * timeDecay);

  // 5. Apply confidence adjustment (Wilson score) with virtual seeding
  // Tier 0 sources get n=10 virtual samples for first 6h
  const sampleSize = cluster.sourceCount + (cluster.headlines.length / 3);
  const virtualSeed = calculateVirtualSeed(cluster);
  const finalScore = confidenceAdjustedScore(afterTimeDecay, sampleSize, virtualSeed);

  return Math.round(finalScore);
}

/**
 * Extract entities from text (proper nouns, organizations, locations)
 */
function extractEntities(text: string): { primary: string[]; secondary: string[]; techTerms: string[] } {
  // Primary entities: Multi-word capitalized phrases (organizations, places, names)
  const primaryPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const primaryMatches = text.match(primaryPattern) || [];
  const primarySet = new Set<string>();
  primaryMatches.forEach(m => primarySet.add(m));
  const primary = Array.from(primarySet).slice(0, 5);

  // Secondary entities: Single capitalized words (not at sentence start)
  const secondaryPattern = /[a-z]\s+([A-Z][a-z]+)\b/g;
  const secondarySet = new Set<string>();
  let match;
  while ((match = secondaryPattern.exec(text)) !== null) {
    secondarySet.add(match[1]);
  }
  const secondary = Array.from(secondarySet)
    .filter(s => !primary.some(p => p.includes(s)))
    .slice(0, 5);

  // Tech terms from the SemanticMeat patterns
  const techPatterns = [
    /\b(artificial intelligence|machine learning|deep learning|neural network|llm|gpt)\b/gi,
    /\b(blockchain|cryptocurrency|bitcoin|ethereum|web3)\b/gi,
    /\b(cybersecurity|ransomware|encryption|vulnerability)\b/gi,
    /\b(crispr|mrna|gene therapy|clinical trial)\b/gi,
    /\b(quantum computing|fusion|satellite|spacecraft)\b/gi,
    /\b(gdp|inflation|recession|tariff|sanctions)\b/gi,
  ];
  const techTermsSet = new Set<string>();
  for (const pattern of techPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => techTermsSet.add(m.toLowerCase()));
    }
  }

  return {
    primary,
    secondary,
    techTerms: Array.from(techTermsSet).slice(0, 5),
  };
}

/**
 * Generate Deep Research Plan for high-scoring topics
 * Triggered when FinalScore > 850
 */
function generateDeepResearchPlan(
  cluster: TopicCluster,
  category: string,
  finalScore: number
): DeepResearchPlan {
  const allText = [cluster.topic, ...cluster.headlines.map(h => h.title)].join(' ');
  const entities = extractEntities(allText);

  // Generate research queries based on entities
  const factual: string[] = [];
  const contextual: string[] = [];
  const analytical: string[] = [];

  // Factual queries: What happened? Who is involved?
  if (entities.primary.length > 0) {
    factual.push(`What is the current situation regarding ${entities.primary[0]}?`);
    factual.push(`Who are the key stakeholders involved in ${cluster.topic}?`);
  }
  if (entities.techTerms.length > 0) {
    factual.push(`What are the technical details of ${entities.techTerms[0]}?`);
  }
  factual.push(`Timeline of events: ${cluster.topic}`);

  // Contextual queries: Why does this matter? Historical context?
  contextual.push(`Historical context and precedents for ${cluster.topic}`);
  contextual.push(`Why is ${cluster.topic} significant for ${category}?`);
  if (entities.primary.length > 1) {
    contextual.push(`Relationship between ${entities.primary[0]} and ${entities.primary[1]}`);
  }

  // Analytical queries: Implications? Competing perspectives?
  analytical.push(`What are the potential implications of ${cluster.topic}?`);
  analytical.push(`Different perspectives and analysis on ${cluster.topic}`);
  analytical.push(`Expert opinions and forecasts regarding ${cluster.topic}`);
  if (cluster.depthScore?.controversy && cluster.depthScore.controversy > 0.5) {
    analytical.push(`Arguments for and against positions on ${cluster.topic}`);
  }

  // Suggest sources based on category
  const categorySourceSuggestions: Record<string, string[]> = {
    Geopolitics: ['Foreign Affairs', 'Foreign Policy', 'The Diplomat', 'Council on Foreign Relations'],
    Economics: ['The Economist', 'Financial Times', 'Bloomberg', 'Federal Reserve'],
    Technology: ['MIT Technology Review', 'Ars Technica', 'Wired', 'IEEE Spectrum'],
    Science: ['Nature', 'Science', 'Quanta Magazine', 'Scientific American'],
    Climate: ['Carbon Brief', 'Yale Climate Connections', 'IPCC', 'Nature Climate Change'],
    Conflict: ['International Crisis Group', 'War on the Rocks', 'Institute for the Study of War'],
    Society: ['The Atlantic', 'The New Yorker', 'Pew Research', 'Brookings Institution'],
  };

  return {
    triggered: true,
    finalScore,
    topic: cluster.topic,
    category,
    entities,
    researchQueries: {
      factual,
      contextual,
      analytical,
    },
    suggestedSources: categorySourceSuggestions[category] || categorySourceSuggestions['Geopolitics'],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Enrich top clusters with GDELT data, calculate Meat-Score and Depth-Score
 * Only enriches top N clusters to minimize API calls
 */
async function enrichWithGDELT(
  clusters: TopicCluster[],
  category: string,
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
        const meatScore = calculateMeatScoreFallback(cluster);
        const depthScore = calculateDepthScore(
          cluster.topic,
          cluster.headlines.map(h => h.title),
          meatScore.sentimentVariance
        );
        return {
          ...cluster,
          meatScore,
          depthScore,
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

      // Calculate Depth-Score
      const depthScore = calculateDepthScore(
        cluster.topic,
        cluster.headlines.map(h => h.title),
        meatScore.sentimentVariance
      );

      const shallowFlag = isShallowTopic(depthScore) ? ' [SHALLOW]' : '';
      console.log(
        `  [${cluster.topic.slice(0, 30)}...] Meat:${meatScore.meatScore} Depth:${depthScore.depthScore}${shallowFlag} ` +
        `(E:${meatScore.entityDensity} V:${meatScore.velocity} S:${meatScore.sentimentVariance} L:${meatScore.linkage})`
      );

      return {
        ...cluster,
        meatScore,
        depthScore,
      };
    } catch {
      console.error(`  [${cluster.topic.slice(0, 30)}...] GDELT error, using fallback`);
      const meatScore = calculateMeatScoreFallback(cluster);
      const depthScore = calculateDepthScore(
        cluster.topic,
        cluster.headlines.map(h => h.title),
        meatScore.sentimentVariance
      );
      return {
        ...cluster,
        meatScore,
        depthScore,
      };
    }
  });

  const enrichedTop = await Promise.all(enrichmentPromises);
  enrichedClusters.push(...enrichedTop);

  // Add remaining clusters with fallback scores
  for (const cluster of remainingClusters) {
    const meatScore = calculateMeatScoreFallback(cluster);
    const depthScore = calculateDepthScore(
      cluster.topic,
      cluster.headlines.map(h => h.title),
      meatScore.sentimentVariance
    );
    enrichedClusters.push({
      ...cluster,
      meatScore,
      depthScore,
    });
  }

  // Re-sort by combined score (0.4 * SemanticMeat + 0.6 * EntityDepth)
  enrichedClusters.sort((a, b) => {
    const combinedA = calculateCombinedScore(a, category);
    const combinedB = calculateCombinedScore(b, category);

    if (combinedA !== combinedB) return combinedB - combinedA;
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
  // All categories now require 2+ sources for validation (overlapping mainstream sources added)
  // Science/Climate need lower threshold (0.15) due to specialized vocabulary
  const CLUSTERING_THRESHOLDS: Record<string, number> = {
    Science: 0.15,
    Climate: 0.15,
  };
  const clusteringThreshold = CLUSTERING_THRESHOLDS[category] ?? 0.20;
  const clusters = clusterHeadlines(headlines, 2, clusteringThreshold);
  console.log(`Formed ${clusters.length} topic clusters (min 2 sources, threshold ${clusteringThreshold})`);

  // 4. Score and rank clusters (initial hotness scoring)
  console.log('\n📈 Scoring clusters...');
  const rankedClusters = rankClusters(clusters);

  // 5. Enrich with GDELT and calculate Meat-Score
  const enrichedClusters = await enrichWithGDELT(rankedClusters, category, 5);

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

  console.log(`\n🏆 Top 5 trending topics (by Combined Score: 0.4*SemanticMeat + 0.6*EntityDepth):`);
  availableClusters.slice(0, 5).forEach((c, i) => {
    const combinedScore = calculateCombinedScore(c, category);
    const isShallow = c.depthScore && isShallowTopic(c.depthScore);
    const depthEmoji = isShallow ? '⚠️' : c.depthScore && c.depthScore.depthScore >= 300 ? '🔬' : '📰';
    const shallowLabel = isShallow ? ' [SHALLOW]' : '';
    const deepResearchFlag = combinedScore > DEEP_RESEARCH_THRESHOLD ? ' 🔬[DEEP]' : '';
    console.log(
      `  ${i + 1}. ${depthEmoji} [C:${combinedScore} M:${c.meatScore?.meatScore ?? 0} D:${c.depthScore?.depthScore ?? 0}] ${c.topic} (${c.sourceCount} sources)${shallowLabel}${deepResearchFlag}`
    );
  });

  // 8. Auto-select the best topic (prefer Meat-Score, fallback to hotness)
  let selectedTopic: TrendingTopic | null = null;

  const bestCluster = availableClusters[0];
  const meetsThreshold =
    (bestCluster?.meatScore?.meatScore ?? 0) >= MINIMUM_MEAT_SCORE_THRESHOLD ||
    (bestCluster?.hotnessScore ?? 0) >= MINIMUM_HOTNESS_THRESHOLD;

  if (bestCluster && meetsThreshold) {
    const combinedScore = calculateCombinedScore(bestCluster, category);
    const shallow = bestCluster.depthScore ? isShallowTopic(bestCluster.depthScore) : false;

    // Trigger Deep Research if score > 850
    const deepResearch = combinedScore > DEEP_RESEARCH_THRESHOLD
      ? generateDeepResearchPlan(bestCluster, category, combinedScore)
      : undefined;

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
      // Depth-Score fields
      depthScore: bestCluster.depthScore?.depthScore,
      isShallow: shallow,
      // Deep Research (if triggered)
      deepResearch,
    };

    const deepLabel = deepResearch ? ' 🔬 [DEEP RESEARCH TRIGGERED]' : '';
    console.log(
      `\n✅ Selected: "${selectedTopic.topic}" ` +
      `(Combined: ${combinedScore}, Meat: ${selectedTopic.meatScore ?? 'N/A'}, Depth: ${selectedTopic.depthScore ?? 'N/A'})${deepLabel}`
    );

    // Output Deep Research Plan JSON if triggered
    if (deepResearch) {
      console.log('\n📋 Deep Research Plan:');
      console.log(JSON.stringify(deepResearch, null, 2));
    }
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

  // Convert clusters to trending topics (with Meat-Score and Depth-Score data)
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
      // Depth-Score fields
      depthScore: cluster.depthScore?.depthScore,
      isShallow: cluster.depthScore ? isShallowTopic(cluster.depthScore) : false,
    }));
}

/**
 * Clear the topic cache (useful for forcing refresh)
 */
export function clearTopicCache(): void {
  topicCache.clear();
}
