/**
 * Depth Score Calculator
 * Measures investigation-worthiness vs shallow popularity
 * Penalizes product updates, patches, releases in favor of systemic impact topics
 */

export interface DepthScoreComponents {
  systemicImpact: number;     // Affects economy, policy, large populations (0-1)
  controversy: number;        // Multiple stakeholders, debate (0-1)
  emergingPattern: number;    // Signals broader trend, paradigm shift (0-1)
  shallowPenalty: number;     // Penalty for product updates, patches (0-0.7)
  depthScore: number;         // Combined score (0-1000 scale)
}

// Keywords indicating broad systemic impact
const SYSTEMIC_IMPACT_KEYWORDS = {
  policy: [
    'policy', 'law', 'regulation', 'legislation', 'reform', 'sanctions',
    'treaty', 'agreement', 'bill', 'act', 'mandate', 'ruling', 'verdict',
    'court', 'supreme', 'constitutional', 'ban', 'restrict', 'legalize',
  ],
  economic: [
    'economy', 'gdp', 'inflation', 'recession', 'trade', 'tariff',
    'central bank', 'interest rate', 'debt', 'deficit', 'stimulus',
    'unemployment', 'labor', 'wage', 'market', 'crash', 'crisis',
    'federal reserve', 'treasury', 'budget', 'fiscal', 'monetary',
  ],
  geopolitical: [
    'war', 'conflict', 'crisis', 'alliance', 'diplomatic', 'summit',
    'united nations', 'nato', 'sanctions', 'invasion', 'occupation',
    'ceasefire', 'peace', 'negotiate', 'tension', 'escalation',
    'military', 'troops', 'weapons', 'nuclear', 'missile',
  ],
  social: [
    'population', 'demographic', 'health', 'education', 'inequality',
    'rights', 'civil', 'protest', 'movement', 'reform', 'justice',
    'immigration', 'refugee', 'housing', 'poverty', 'welfare',
    'healthcare', 'pandemic', 'epidemic', 'public health',
  ],
};

// Keywords indicating controversy/debate
const CONTROVERSY_KEYWORDS = [
  'debate', 'controversy', 'controversial', 'critics', 'supporters',
  'opponents', 'disagree', 'dispute', 'clash', 'divided', 'contested',
  'backlash', 'opposition', 'protest', 'defend', 'accuse', 'blame',
  'outrage', 'anger', 'concern', 'fear', 'warn', 'threat',
  'challenge', 'question', 'doubt', 'skeptic',
];

// Keywords indicating emerging patterns/trends
const EMERGING_PATTERN_KEYWORDS = [
  'trend', 'rising', 'growing', 'shift', 'transition', 'transformation',
  'unprecedented', 'historic', 'first time', 'record', 'surge', 'spike',
  'breakthrough', 'landmark', 'milestone', 'turning point', 'paradigm',
  'emerging', 'new era', 'reshape', 'redefine', 'revolution',
  'accelerate', 'momentum', 'wave', 'movement',
];

// Patterns for shallow topics (product updates, patches, releases)
const SHALLOW_PATTERNS = [
  /\b(patch|patches|patched|patching)\b/i,
  /\b(update|updates|updated|updating)\s+(available|released|rolling|now)/i,
  /\b(release|releases|released|releasing)\s+(new|version|v\d)/i,
  /\b(version|v\d+\.\d+)/i,
  /\b(bug\s*fix|bugfix|hotfix|fix\s+for)\b/i,
  /\b(feature|features)\s+(added|new|coming)\b/i,
  /\b(app|application)\s+(update|store)\b/i,
  /\b(download|available\s+now|out\s+now)\b/i,
  /\b(ios|android|macos|windows)\s+\d+(\.\d+)?\b/i,
  /\b(beta|alpha|preview|rc\d*)\s+(available|released)/i,
  /\b(changelog|release\s+notes)\b/i,
  /\b(security\s+patch|firmware\s+update)\b/i,
  /\b(upgrade|upgrading)\s+(to|from)\s+v?\d/i,
  /\b(new\s+version|latest\s+version)\b/i,
];

// Additional shallow context patterns (when combined with tech companies)
const TECH_COMPANY_RELEASE_PATTERNS = [
  /\b(apple|google|microsoft|meta|amazon|tesla|nvidia)\b.*\b(releases?|launches?|announces?|unveils?)\b/i,
  /\b(iphone|ipad|mac|pixel|surface|galaxy)\b.*\b(update|new|release)/i,
];

// Negative signal patterns (promotional, clickbait, listicles)
const NEGATIVE_SIGNALS = {
  // Promotional patterns
  promotional: [
    /\b(buy now|limited time|discount|sale|promo|deal|offer)\b/i,
    /\b(sponsored|ad|advertisement|partner content)\b/i,
    /\b(exclusive offer|special price|save \d+%)\b/i,
  ],
  // Clickbait patterns
  clickbait: [
    /\b(you won't believe|shocking|mind-blowing|jaw-dropping)\b/i,
    /\b(this one weird trick|doctors hate|secret revealed)\b/i,
    /\b(what happens next|will shock you|changed everything)\b/i,
    /\b(finally revealed|exposed|the truth about)\b/i,
  ],
  // Listicle patterns (often shallow)
  listicle: [
    /^\d+\s+(things|ways|reasons|tips|tricks|hacks|secrets)/i,
    /\btop\s+\d+\b/i,
    /\bbest\s+\d+\b/i,
  ],
};

// Exclusion patterns for systemic impact keywords (prevent false positives)
const SYSTEMIC_IMPACT_EXCLUSIONS = {
  geopolitical: [
    /star wars/i, /game of thrones/i, /call of duty/i,
    /world of warcraft/i, /war(craft|frame|hammer)/i,
    /avengers.*war/i, /infinity war/i, /civil war.*marvel/i,
  ],
  economic: [
    /fantasy (football|league|basketball)/i,
    /market(place|ing)/i,
    /stock market game/i,
  ],
};

/**
 * Check if text matches any exclusion pattern
 * Prevents false positives like "Star Wars" triggering geopolitical keywords
 */
function matchesExclusion(text: string): boolean {
  for (const exclusions of Object.values(SYSTEMIC_IMPACT_EXCLUSIONS)) {
    for (const pattern of exclusions) {
      if (pattern.test(text)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate systemic impact score
 */
function calculateSystemicImpact(text: string): number {
  // Check exclusions first - skip scoring if it's likely a false positive
  if (matchesExclusion(text)) {
    return 0;
  }

  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const category of Object.values(SYSTEMIC_IMPACT_KEYWORDS)) {
    for (const keyword of category) {
      if (lowerText.includes(keyword)) {
        matchCount++;
      }
    }
  }

  // Normalize to 0-1, with diminishing returns after 3 matches
  const rawScore = Math.min(matchCount / 3, 1);
  return rawScore;
}

/**
 * Calculate negative signal penalty for low-quality patterns
 * Returns 0-0.3 (0 = no penalty, 0.3 = max penalty for promotional/clickbait)
 */
export function calculateNegativePenalty(text: string): number {
  let penalty = 0;

  for (const [type, patterns] of Object.entries(NEGATIVE_SIGNALS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        // Different penalties by type
        const typePenalty = type === 'clickbait' ? 0.15 : type === 'promotional' ? 0.12 : 0.08;
        penalty += typePenalty;
      }
    }
  }

  // Cap at 30% penalty
  return Math.min(penalty, 0.3);
}

/**
 * Calculate controversy/debate score
 */
function calculateControversy(text: string, sentimentVariance?: number): number {
  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of CONTROVERSY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  }

  // Keyword-based score
  const keywordScore = Math.min(matchCount / 2, 1);

  // Use sentiment variance if available (high variance = debate)
  const varianceScore = sentimentVariance !== undefined
    ? Math.min(sentimentVariance / 30, 1) // 30 is high variance
    : 0;

  // Combine: max of both signals
  return Math.max(keywordScore, varianceScore);
}

/**
 * Calculate emerging pattern score
 */
function calculateEmergingPattern(text: string): number {
  const lowerText = text.toLowerCase();
  let matchCount = 0;

  for (const keyword of EMERGING_PATTERN_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  }

  // Normalize to 0-1
  return Math.min(matchCount / 2, 1);
}

/**
 * Calculate shallow topic penalty
 * Returns 0-0.7 (0 = no penalty, 0.7 = max penalty for very shallow)
 */
function calculateShallowPenalty(text: string): number {
  const lowerText = text.toLowerCase();
  let penaltyScore = 0;

  // Check primary shallow patterns
  for (const pattern of SHALLOW_PATTERNS) {
    if (pattern.test(text)) {
      penaltyScore += 0.25;
    }
  }

  // Check tech company release patterns (compound penalty)
  for (const pattern of TECH_COMPANY_RELEASE_PATTERNS) {
    if (pattern.test(text)) {
      penaltyScore += 0.15;
    }
  }

  // Additional penalties for specific shallow terms
  const shallowTerms = [
    'download', 'install', 'upgrade', 'changelog', 'patch notes',
    'bug fixes', 'performance improvements', 'stability',
  ];
  for (const term of shallowTerms) {
    if (lowerText.includes(term)) {
      penaltyScore += 0.1;
    }
  }

  // Cap penalty at 0.7 (70% reduction)
  return Math.min(penaltyScore, 0.7);
}

/**
 * Calculate comprehensive depth score for a topic cluster
 */
export function calculateDepthScore(
  topicText: string,
  headlines: string[],
  sentimentVariance?: number
): DepthScoreComponents {
  // Combine all text for analysis
  const allText = [topicText, ...headlines].join(' ');

  // Calculate individual components
  const systemicImpact = calculateSystemicImpact(allText);
  const controversy = calculateControversy(allText, sentimentVariance);
  const emergingPattern = calculateEmergingPattern(allText);
  const shallowPenalty = calculateShallowPenalty(allText);

  // Calculate base depth score (weighted combination)
  // Systemic impact is most important, followed by controversy, then emerging patterns
  const baseScore = (
    systemicImpact * 0.50 +
    controversy * 0.30 +
    emergingPattern * 0.20
  );

  // Apply shallow penalty
  const adjustedScore = baseScore * (1 - shallowPenalty);

  // Scale to 0-1000 for consistency with other scores
  const depthScore = Math.round(adjustedScore * 1000);

  return {
    systemicImpact: Math.round(systemicImpact * 100) / 100,
    controversy: Math.round(controversy * 100) / 100,
    emergingPattern: Math.round(emergingPattern * 100) / 100,
    shallowPenalty: Math.round(shallowPenalty * 100) / 100,
    depthScore,
  };
}

/**
 * Get a human-readable label for depth score
 */
export function getDepthLabel(depthScore: number, shallowPenalty: number): string {
  if (shallowPenalty >= 0.4) {
    return 'Shallow Update';
  }
  if (depthScore >= 500) {
    return 'Deep Analysis';
  }
  if (depthScore >= 300) {
    return 'Substantive';
  }
  if (depthScore >= 150) {
    return 'Moderate Depth';
  }
  return 'Breaking News';
}

/**
 * Check if a topic should be flagged as shallow
 */
export function isShallowTopic(depthScore: DepthScoreComponents): boolean {
  return depthScore.shallowPenalty >= 0.3;
}
