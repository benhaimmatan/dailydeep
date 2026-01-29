/**
 * News Source Configuration
 * Defines quality-weighted sources for each category
 */

import { SourceConfig } from './types';

// Category mapping to source configurations
export const CATEGORY_SOURCES: Record<string, SourceConfig[]> = {
  Geopolitics: [
    // Tier 0 - Deep Analysis (investigation-focused)
    { name: 'Foreign Affairs', tier: 0, type: 'rss', url: 'https://www.foreignaffairs.com/rss.xml', categories: ['Geopolitics'] },
    { name: 'Foreign Policy', tier: 0, type: 'rss', url: 'https://foreignpolicy.com/feed/', categories: ['Geopolitics'] },
    { name: 'The Diplomat', tier: 0, type: 'rss', url: 'https://thediplomat.com/feed/', categories: ['Geopolitics'] },
    // Tier 1 - Premium quality
    { name: 'Reuters World', tier: 1, type: 'rss', url: 'https://rsshub.app/reuters/world', categories: ['Geopolitics'] },
    { name: 'AP News', tier: 1, type: 'rss', url: 'https://rsshub.app/apnews/topics/world-news', categories: ['Geopolitics'] },
    { name: 'BBC World', tier: 1, type: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', categories: ['Geopolitics'] },
    // Tier 2 - Quality mainstream
    { name: 'DW News', tier: 2, type: 'rss', url: 'https://rss.dw.com/xml/rss-en-world', categories: ['Geopolitics'] },
    { name: 'Guardian World', tier: 2, type: 'rss', url: 'https://www.theguardian.com/world/rss', categories: ['Geopolitics'] },
    // Tier 3 - General coverage
    { name: 'NPR World', tier: 3, type: 'rss', url: 'https://feeds.npr.org/1004/rss.xml', categories: ['Geopolitics'] },
  ],

  Economics: [
    // Tier 0 - Deep Analysis (investigation-focused)
    { name: 'The Economist', tier: 0, type: 'rss', url: 'https://www.economist.com/finance-and-economics/rss.xml', categories: ['Economics'] },
    { name: 'Project Syndicate', tier: 0, type: 'rss', url: 'https://www.project-syndicate.org/rss', categories: ['Economics'] },
    { name: 'Brookings', tier: 0, type: 'rss', url: 'https://www.brookings.edu/feed/', categories: ['Economics'] },
    // Tier 1 - Premium financial
    { name: 'Reuters Business', tier: 1, type: 'rss', url: 'https://rsshub.app/reuters/business', categories: ['Economics'] },
    { name: 'FT', tier: 1, type: 'api', url: 'https://saurav.tech/NewsAPI/top-headlines/category/business/us.json', categories: ['Economics'] },
    // Tier 2 - Business news
    { name: 'BBC Business', tier: 2, type: 'rss', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', categories: ['Economics'] },
    { name: 'CNBC', tier: 2, type: 'api', url: 'https://saurav.tech/NewsAPI/top-headlines/category/business/us.json', categories: ['Economics'] },
    // Tier 3
    { name: 'NPR Economy', tier: 3, type: 'rss', url: 'https://feeds.npr.org/1006/rss.xml', categories: ['Economics'] },
  ],

  Technology: [
    // Tier 0 - Deep Analysis (investigation-focused)
    { name: 'MIT Technology Review', tier: 0, type: 'rss', url: 'https://www.technologyreview.com/feed/', categories: ['Technology'] },
    { name: 'Stratechery', tier: 0, type: 'rss', url: 'https://stratechery.com/feed/', categories: ['Technology'] },
    // Tier 1 - Tech authority
    { name: 'HackerNews', tier: 1, type: 'hackernews', url: 'https://hacker-news.firebaseio.com/v0/topstories.json', categories: ['Technology'] },
    { name: 'Ars Technica', tier: 1, type: 'rss', url: 'https://feeds.arstechnica.com/arstechnica/index', categories: ['Technology'] },
    { name: 'Wired', tier: 1, type: 'rss', url: 'https://www.wired.com/feed/rss', categories: ['Technology'] },
    // Tier 2
    { name: 'TechCrunch', tier: 2, type: 'rss', url: 'https://techcrunch.com/feed/', categories: ['Technology'] },
    { name: 'The Verge', tier: 2, type: 'rss', url: 'https://www.theverge.com/rss/index.xml', categories: ['Technology'] },
    // Tier 3
    { name: 'Reddit Tech', tier: 3, type: 'reddit', url: 'https://www.reddit.com/r/technology/top.json?t=day&limit=25', categories: ['Technology'] },
  ],

  Climate: [
    // Tier 0 - Deep Analysis (investigation-focused)
    { name: 'Yale Climate Connections', tier: 0, type: 'rss', url: 'https://yaleclimateconnections.org/feed/', categories: ['Climate'] },
    // Tier 1 - Scientific authority
    { name: 'Nature Climate', tier: 1, type: 'rss', url: 'https://www.nature.com/nclimate.rss', categories: ['Climate', 'Science'] },
    { name: 'Carbon Brief', tier: 1, type: 'rss', url: 'https://www.carbonbrief.org/feed/', categories: ['Climate'] },
    // Tier 2 - Overlapping mainstream for cross-validation
    { name: 'Guardian Environment', tier: 2, type: 'rss', url: 'https://www.theguardian.com/environment/rss', categories: ['Climate'] },
    { name: 'Guardian Climate', tier: 2, type: 'rss', url: 'https://www.theguardian.com/environment/climate-crisis/rss', categories: ['Climate'] },
    { name: 'BBC Environment', tier: 2, type: 'rss', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', categories: ['Climate', 'Science'] },
    { name: 'NPR Climate', tier: 2, type: 'rss', url: 'https://feeds.npr.org/1025/rss.xml', categories: ['Climate'] },
    // Tier 3
    { name: 'Phys.org Climate', tier: 3, type: 'rss', url: 'https://phys.org/rss-feed/earth-news/environment/', categories: ['Climate'] },
  ],

  Society: [
    // Tier 0 - Deep Analysis
    { name: 'The Atlantic', tier: 0, type: 'rss', url: 'https://www.theatlantic.com/feed/all/', categories: ['Society'] },
    { name: 'The New Yorker', tier: 0, type: 'rss', url: 'https://www.newyorker.com/feed/news', categories: ['Society'] },
    // Tier 1 - Quality analysis
    { name: 'Guardian', tier: 1, type: 'rss', url: 'https://www.theguardian.com/society/rss', categories: ['Society'] },
    { name: 'Atlantic General', tier: 1, type: 'api', url: 'https://saurav.tech/NewsAPI/top-headlines/category/general/us.json', categories: ['Society'] },
    // Tier 2
    { name: 'BBC', tier: 2, type: 'rss', url: 'https://feeds.bbci.co.uk/news/rss.xml', categories: ['Society'] },
    { name: 'NPR', tier: 2, type: 'rss', url: 'https://feeds.npr.org/1001/rss.xml', categories: ['Society'] },
    // Tier 3
    { name: 'Reddit News', tier: 3, type: 'reddit', url: 'https://www.reddit.com/r/worldnews/top.json?t=day&limit=25', categories: ['Society', 'Geopolitics'] },
  ],

  Science: [
    // Tier 0 - Deep Analysis (investigation-focused)
    { name: 'Quanta Magazine', tier: 0, type: 'rss', url: 'https://api.quantamagazine.org/feed/', categories: ['Science'] },
    { name: 'Nautilus', tier: 0, type: 'rss', url: 'https://nautil.us/feed/', categories: ['Science'] },
    // Tier 1 - Scientific journals
    { name: 'Nature', tier: 1, type: 'rss', url: 'https://www.nature.com/nature.rss', categories: ['Science'] },
    { name: 'Science Mag', tier: 1, type: 'rss', url: 'https://www.science.org/rss/news_current.xml', categories: ['Science'] },
    { name: 'Phys.org', tier: 1, type: 'rss', url: 'https://phys.org/rss-feed/', categories: ['Science'] },
    // Tier 2 - Overlapping mainstream for cross-validation
    { name: 'Scientific American', tier: 2, type: 'rss', url: 'https://rss.sciam.com/ScientificAmerican-Global', categories: ['Science'] },
    { name: 'New Scientist', tier: 2, type: 'rss', url: 'https://www.newscientist.com/feed/home/', categories: ['Science'] },
    { name: 'BBC Science', tier: 2, type: 'rss', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', categories: ['Science', 'Climate'] },
    { name: 'Guardian Science', tier: 2, type: 'rss', url: 'https://www.theguardian.com/science/rss', categories: ['Science'] },
    { name: 'NPR Science', tier: 2, type: 'rss', url: 'https://feeds.npr.org/1007/rss.xml', categories: ['Science'] },
    // Tier 3
    { name: 'Reddit Science', tier: 3, type: 'reddit', url: 'https://www.reddit.com/r/science/top.json?t=day&limit=25', categories: ['Science'] },
  ],

  Conflict: [
    // Tier 0 - Deep Analysis (investigation-focused)
    { name: 'International Crisis Group', tier: 0, type: 'rss', url: 'https://www.crisisgroup.org/rss.xml', categories: ['Conflict', 'Geopolitics'] },
    { name: 'War on the Rocks', tier: 0, type: 'rss', url: 'https://warontherocks.com/feed/', categories: ['Conflict', 'Geopolitics'] },
    // Tier 1 - Wire services
    { name: 'Reuters', tier: 1, type: 'rss', url: 'https://rsshub.app/reuters/world', categories: ['Conflict', 'Geopolitics'] },
    { name: 'AP News', tier: 1, type: 'rss', url: 'https://rsshub.app/apnews/topics/world-news', categories: ['Conflict', 'Geopolitics'] },
    { name: 'BBC World', tier: 1, type: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', categories: ['Conflict'] },
    // Tier 2
    { name: 'DW News', tier: 2, type: 'rss', url: 'https://rss.dw.com/xml/rss-en-world', categories: ['Conflict'] },
    { name: 'France24', tier: 2, type: 'rss', url: 'https://www.france24.com/en/rss', categories: ['Conflict'] },
    // Tier 3
    { name: 'Reddit WorldNews', tier: 3, type: 'reddit', url: 'https://www.reddit.com/r/worldnews/top.json?t=day&limit=25', categories: ['Conflict', 'Geopolitics'] },
  ],
};

// Fallback sources for any category
export const FALLBACK_SOURCES: SourceConfig[] = [
  { name: 'NewsAPI General', tier: 2, type: 'api', url: 'https://saurav.tech/NewsAPI/top-headlines/category/general/us.json', categories: ['*'] },
  { name: 'BBC Top', tier: 2, type: 'rss', url: 'https://feeds.bbci.co.uk/news/rss.xml', categories: ['*'] },
  { name: 'Reuters Top', tier: 1, type: 'rss', url: 'https://rsshub.app/reuters/world', categories: ['*'] },
];

/**
 * Get sources for a specific category
 */
export function getSourcesForCategory(category: string): SourceConfig[] {
  const categorySources = CATEGORY_SOURCES[category];
  if (categorySources && categorySources.length > 0) {
    return categorySources;
  }
  return FALLBACK_SOURCES;
}

/**
 * Quality tier weights for scoring
 */
export const TIER_WEIGHTS: Record<number, number> = {
  0: 15, // Deep analysis sources (investigation-focused)
  1: 10, // Premium/authoritative sources
  2: 7,  // Quality mainstream
  3: 4,  // General/social
};
