'use client';

import { useState } from 'react';
import { TopicSelector } from '@/components/admin/topic-selector';

interface Category {
  id: string;
  name: string;
  slug: string;
  day_of_week: number;
}

interface Props {
  categories: Category[];
  defaultCategoryId?: string;
}

export function GenerationPage({ categories, defaultCategoryId }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId || '');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !topic.trim()) return;

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          topic: topic.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setSuccess(`Report generated successfully! ID: ${data.reportId}`);
      setTopic('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Generate Report
        </h1>
        <p className="text-muted-foreground mt-2">
          Select a category and topic to generate a new investigative report.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="bg-card border border-border rounded-lg p-6 space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
            required
            disabled={isGenerating}
          >
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Topic Selector with Trends */}
        {selectedCategory && (
          <TopicSelector
            categoryName={selectedCategory.name}
            value={topic}
            onChange={setTopic}
            disabled={isGenerating}
          />
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md">
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !selectedCategoryId || !topic.trim()}
          className="w-full px-6 py-3 bg-accent text-accent-foreground font-medium rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          Generation takes 1-2 minutes. You&apos;ll be notified when complete.
        </p>
      </form>
    </div>
  );
}
