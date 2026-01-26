'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { GenerationJob } from '@/types/database';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  jobId: string;
  onComplete?: () => void;
}

export function GenerationStatus({ jobId, onComplete }: Props) {
  const router = useRouter();
  const [shouldPoll, setShouldPoll] = useState(true);

  const { data: job, error } = useSWR<GenerationJob>(
    `/api/admin/status/${jobId}`,
    fetcher,
    {
      refreshInterval: shouldPoll ? 3000 : 0, // Poll every 3 seconds while active
    }
  );

  // Stop polling when job completes or fails
  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed') {
      setShouldPoll(false);
    }
  }, [job?.status]);

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded-md">
        <p className="text-red-500">Failed to load job status</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 bg-muted rounded-md animate-pulse">
        <p>Loading job status...</p>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-gray-500/10 border-gray-500 text-gray-400',
    generating: 'bg-amber-500/10 border-amber-500 text-amber-400',
    validating: 'bg-blue-500/10 border-blue-500 text-blue-400',
    completed: 'bg-green-500/10 border-green-500 text-green-400',
    failed: 'bg-red-500/10 border-red-500 text-red-400',
  };

  return (
    <div className={`p-4 border rounded-md ${statusColors[job.status as keyof typeof statusColors]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium capitalize">{job.status}</span>
        {job.status === 'generating' && (
          <span className="animate-pulse text-xl">*</span>
        )}
      </div>

      <p className="text-sm">{job.progress || 'Waiting...'}</p>

      {job.status === 'failed' && job.error && (
        <p className="mt-2 text-sm text-red-400">Error: {job.error}</p>
      )}

      {job.status === 'completed' && job.report_id && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              router.push(`/admin/reports`);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            View Reports
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted"
          >
            Generate Another
          </button>
        </div>
      )}
    </div>
  );
}
