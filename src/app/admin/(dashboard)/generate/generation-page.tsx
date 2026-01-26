'use client';

import { useState } from 'react';
import { GenerationTrigger } from '@/components/admin/generation-trigger';
import { GenerationStatus } from '@/components/admin/generation-status';

interface Props {
  categories: { id: string; name: string }[];
  todayCategoryId: string;
}

export function GenerationPage({ categories, todayCategoryId }: Props) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {!activeJobId ? (
        <GenerationTrigger
          categories={categories}
          todayCategoryId={todayCategoryId}
          onJobStarted={setActiveJobId}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Generation Progress</h2>
          <GenerationStatus
            jobId={activeJobId}
            onComplete={() => setActiveJobId(null)}
          />
        </div>
      )}
    </div>
  );
}
