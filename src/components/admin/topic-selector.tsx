'use client';

import { useState, useEffect } from 'react';

interface TrendingTopic {
  title: string;
  traffic: string;
  hotnessScore: number;
  sources: string[];
  sampleHeadlines: string[];
  firstSeenHoursAgo: number;
}

interface Props {
  categoryName: string;
  value: string;
  onChange: (topic: string) => void;
  disabled?: boolean;
}

function getHotnessEmoji(score: number): string {
  if (score >= 500) return '🔥🔥🔥';
  if (score >= 300) return '🔥🔥';
  if (score >= 150) return '🔥';
  return '📰';
}

function getHotnessLabel(score: number): string {
  if (score >= 500) return 'Very Hot';
  if (score >= 300) return 'Hot';
  if (score >= 150) return 'Trending';
  return 'Recent';
}

export function TopicSelector({ categoryName, value, onChange, disabled }: Props) {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Fetch trends when category changes
  useEffect(() => {
    if (!categoryName) return;

    async function fetchTrends() {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/trends?category=${encodeURIComponent(categoryName)}`);
        const data = await res.json();

        if (data.trends) {
          setTrends(data.trends);
        } else {
          setTrends([]);
        }
      } catch {
        setError('Failed to load trending topics');
        setTrends([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [categoryName]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-2">Topic</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a topic or select from suggestions below..."
          className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
          required
          minLength={3}
          disabled={disabled}
        />
      </div>

      {/* Trending Topics Section */}
      <div className="border border-border rounded-md p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <span className="text-primary">Trending in {categoryName}</span>
            {loading && <span className="animate-pulse text-muted-foreground">fetching from multiple sources...</span>}
          </h3>
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showSuggestions ? 'Hide' : 'Show'}
          </button>
        </div>

        {showSuggestions && (
          <>
            {error && (
              <p className="text-xs text-amber-500 mb-2">{error}</p>
            )}

            {trends.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground">
                No trending topics found. Enter a custom topic above.
              </p>
            )}

            {trends.length > 0 && (
              <div className="space-y-2">
                {trends.slice(0, 7).map((trend, index) => (
                  <div key={index} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => onChange(trend.title)}
                      disabled={disabled}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                        ${value === trend.title
                          ? 'bg-primary/20 border border-primary text-primary'
                          : 'bg-background border border-border hover:border-primary/50'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          <span>{getHotnessEmoji(trend.hotnessScore)}</span>
                          <span>{trend.title}</span>
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${
                            trend.hotnessScore >= 300
                              ? 'bg-red-500/20 text-red-400'
                              : trend.hotnessScore >= 150
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {getHotnessLabel(trend.hotnessScore)}
                          </span>
                          <span className="text-muted-foreground">
                            {trend.traffic}
                          </span>
                        </div>
                      </div>

                      {/* First seen indicator */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>First seen: {trend.firstSeenHoursAgo}h ago</span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedIndex(expandedIndex === index ? null : index);
                          }}
                          className="text-primary hover:underline"
                        >
                          {expandedIndex === index ? 'Hide details' : 'Show details'}
                        </button>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {expandedIndex === index && (
                      <div className="ml-3 pl-3 border-l-2 border-primary/30 text-xs space-y-2 py-2">
                        <div>
                          <span className="text-muted-foreground">Sources: </span>
                          <span className="text-foreground">
                            {trend.sources.slice(0, 5).join(', ')}
                            {trend.sources.length > 5 && ` +${trend.sources.length - 5} more`}
                          </span>
                        </div>
                        {trend.sampleHeadlines.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Sample headlines:</span>
                            <ul className="space-y-1">
                              {trend.sampleHeadlines.slice(0, 3).map((headline, i) => (
                                <li key={i} className="text-foreground/80 italic">
                                  &ldquo;{headline.slice(0, 80)}{headline.length > 80 ? '...' : ''}&rdquo;
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {trends.length > 7 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{trends.length - 7} more trending topics
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Topics ranked by hotness score (source diversity × quality × recency). Recently used topics filtered out.
      </p>
    </div>
  );
}
