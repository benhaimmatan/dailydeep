/**
 * Meat-Score Calculator
 * Ranks topics by entity complexity, sentiment variance, and cross-platform resonance
 *
 * Formula: M = α(E × Vv) + β(Svar × L)
 * - E = Entity Density (unique named entities / total tokens)
 * - Vv = Velocity (change in mention volume over 12 hours)
 * - Svar = Sentiment Variance (std dev of sentiment across sources)
 * - L = Linkage (unique referring sources)
 * - α, β = Tunable weights (default: α=0.6, β=0.4)
 */

import { TopicCluster, MeatScoreComponents, GDELTArticle } from './types';
import { extractEntitiesFromArticles } from './gdelt';

export const MEAT_SCORE_WEIGHTS = {
  alpha: 0.6,  // Weight for Entity × Velocity term
  beta: 0.4,   // Weight for Sentiment × Linkage term
};

// Normalization constants (to keep score in reasonable range)
const NORMALIZATION = {
  entityDensity: 10,      // Max expected unique entities per article
  velocity: 5,            // Max expected velocity multiplier
  sentimentVariance: 50,  // Max expected sentiment std dev
  linkage: 20,            // Max expected unique sources
};

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate Entity Density (E)
 * unique named entities / article count
 */
function calculateEntityDensity(
  gdeltArticles: GDELTArticle[],
  clusterKeywords: string[]
): number {
  if (gdeltArticles.length === 0) {
    // Fallback: use cluster keywords
    return Math.min(clusterKeywords.length / 5, 1);
  }

  const entities = extractEntitiesFromArticles(gdeltArticles);
  const density = entities.length / Math.max(gdeltArticles.length, 1);

  // Normalize to 0-1 range
  return Math.min(density / NORMALIZATION.entityDensity, 1);
}

/**
 * Calculate Velocity (Vv)
 * (recent12h - previous12h) / max(previous12h, 1)
 * Returns acceleration factor: 1.0 = stable, >1 = accelerating, <1 = decelerating
 */
function calculateVelocity(
  recent12h: number,
  previous12h: number
): number {
  // Avoid division by zero
  const baseline = Math.max(previous12h, 1);
  const rawVelocity = (recent12h - previous12h) / baseline;

  // Transform to positive scale: -1 to +inf maps to 0 to 1+
  // velocity of 0 (stable) = 0.5
  // velocity of -1 (died) = 0
  // velocity of +1 (doubled) = 0.75
  // velocity of +3 (4x growth) = 1.0
  const normalized = (rawVelocity + 1) / (NORMALIZATION.velocity + 1);

  return Math.max(0, Math.min(normalized, 1));
}

/**
 * Calculate Sentiment Variance (Svar)
 * Standard deviation of tone scores across sources
 */
function calculateSentimentVariance(gdeltArticles: GDELTArticle[]): number {
  if (gdeltArticles.length < 2) return 0;

  const tones = gdeltArticles.map(a => a.tone);
  const stdDev = calculateStdDev(tones);

  // Normalize: GDELT tone ranges from -100 to +100
  // Typical variance is 5-20, high variance is 30+
  return Math.min(stdDev / NORMALIZATION.sentimentVariance, 1);
}

/**
 * Calculate Linkage (L)
 * Unique referring sources/domains
 */
function calculateLinkage(
  gdeltArticles: GDELTArticle[],
  clusterSources: string[]
): number {
  // Combine GDELT domains with cluster sources
  const uniqueDomains = new Set<string>();

  for (const article of gdeltArticles) {
    if (article.domain) {
      uniqueDomains.add(article.domain.toLowerCase());
    }
  }

  for (const source of clusterSources) {
    uniqueDomains.add(source.toLowerCase());
  }

  // Normalize to 0-1 range
  return Math.min(uniqueDomains.size / NORMALIZATION.linkage, 1);
}

/**
 * Calculate the complete Meat-Score
 * M = α(E × Vv) + β(Svar × L)
 */
export function calculateMeatScore(
  cluster: TopicCluster,
  gdeltArticles: GDELTArticle[],
  velocityData: { recent12h: number; previous12h: number },
  weights: { alpha: number; beta: number } = MEAT_SCORE_WEIGHTS
): MeatScoreComponents {
  // Calculate individual components
  const entityDensity = calculateEntityDensity(gdeltArticles, cluster.keywords);
  const velocity = calculateVelocity(velocityData.recent12h, velocityData.previous12h);
  const sentimentVariance = calculateSentimentVariance(gdeltArticles);
  const linkage = calculateLinkage(gdeltArticles, cluster.sources);

  // Apply the formula: M = α(E × Vv) + β(Svar × L)
  const entityVelocityTerm = entityDensity * velocity;
  const sentimentLinkageTerm = sentimentVariance * linkage;

  const rawScore = weights.alpha * entityVelocityTerm + weights.beta * sentimentLinkageTerm;

  // Scale to 0-1000 range for display consistency with hotness score
  const meatScore = Math.round(rawScore * 1000);

  return {
    entityDensity: Math.round(entityDensity * 100) / 100,
    velocity: Math.round(velocity * 100) / 100,
    sentimentVariance: Math.round(sentimentVariance * 100) / 100,
    linkage: Math.round(linkage * 100) / 100,
    meatScore,
  };
}

/**
 * Calculate Meat-Score with fallback when GDELT data is unavailable
 * Uses cluster data to estimate components
 */
export function calculateMeatScoreFallback(
  cluster: TopicCluster
): MeatScoreComponents {
  // Estimate entity density from keywords
  const entityDensity = Math.min(cluster.keywords.length / 10, 1);

  // Use cluster velocity (mentions per hour)
  const velocity = Math.min(cluster.velocity / 5, 1);

  // No sentiment data available - use 0
  const sentimentVariance = 0;

  // Linkage from source count
  const linkage = Math.min(cluster.sourceCount / NORMALIZATION.linkage, 1);

  // Calculate score (will be lower without sentiment data)
  const rawScore =
    MEAT_SCORE_WEIGHTS.alpha * (entityDensity * velocity) +
    MEAT_SCORE_WEIGHTS.beta * (sentimentVariance * linkage);

  return {
    entityDensity: Math.round(entityDensity * 100) / 100,
    velocity: Math.round(velocity * 100) / 100,
    sentimentVariance: 0,
    linkage: Math.round(linkage * 100) / 100,
    meatScore: Math.round(rawScore * 1000),
  };
}

/**
 * Get a label for the Meat-Score level
 */
export function getMeatScoreLabel(score: number): string {
  if (score >= 400) return 'Prime Cut';
  if (score >= 250) return 'Choice';
  if (score >= 150) return 'Select';
  return 'Standard';
}

/**
 * Get emoji representation of Meat-Score
 */
export function getMeatScoreEmoji(score: number): string {
  if (score >= 400) return '\uD83E\uDD69\uD83E\uDD69\uD83E\uDD69'; // 🥩🥩🥩
  if (score >= 250) return '\uD83E\uDD69\uD83E\uDD69'; // 🥩🥩
  if (score >= 150) return '\uD83E\uDD69'; // 🥩
  return '\uD83D\uDCF0'; // 📰
}
