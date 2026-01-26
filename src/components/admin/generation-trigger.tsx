'use client';

import { useState } from 'react';
import { TopicSelector } from './topic-selector';

interface Props {
  categories: { id: string; name: string }[];
  todayCategoryId: string;
  onJobStarted: (jobId: string) => void;
}

export function GenerationTrigger({ categories, todayCategoryId, onJobStarted }: Props) {
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState(todayCategoryId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get selected category name for TopicSelector
  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, categoryId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start generation');
      }

      onJobStarted(data.jobId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-md"
          disabled={loading}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} {cat.id === todayCategoryId ? "(Today's)" : ''}
            </option>
          ))}
        </select>
      </div>

      <TopicSelector
        categoryName={selectedCategory?.name || ''}
        value={topic}
        onChange={setTopic}
        disabled={loading}
      />

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || topic.length < 3}
        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Starting Generation...' : 'Generate Test Report'}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Generation takes 5-15 minutes. You&apos;ll see progress updates below.
      </p>
    </form>
  );
}
