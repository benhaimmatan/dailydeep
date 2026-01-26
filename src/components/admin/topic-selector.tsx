'use client';

import { useState, useEffect } from 'react';
import { TrendingTopic } from '@/lib/trends/client';

interface Props {
  categoryName: string;
  value: string;
  onChange: (topic: string) => void;
  disabled?: boolean;
}

export function TopicSelector({ categoryName, value, onChange, disabled }: Props) {
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

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
            {loading && <span className="animate-pulse">...</span>}
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
                {trends.slice(0, 5).map((trend, index) => (
                  <button
                    key={index}
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
                      <span className="font-medium">{trend.title}</span>
                      {trend.traffic && (
                        <span className="text-xs text-muted-foreground">
                          {trend.traffic} searches
                        </span>
                      )}
                    </div>
                    {trend.relatedQueries.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Related: {trend.relatedQueries.slice(0, 3).join(', ')}
                      </p>
                    )}
                  </button>
                ))}

                {trends.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{trends.length - 5} more trending topics
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Select a trending topic or enter your own. Recently used topics are filtered out.
      </p>
    </div>
  );
}
