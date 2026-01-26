-- Generation Jobs table for async report generation tracking
-- This table tracks the status of long-running AI report generation jobs

CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'validating', 'completed', 'failed')),
  progress TEXT,
  error TEXT,
  report_id UUID REFERENCES reports(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status queries (filtering by active/pending jobs)
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);

-- Index for listing jobs by creation time
CREATE INDEX idx_generation_jobs_created ON generation_jobs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to manage generation jobs
-- Admin verification happens in the application layer
CREATE POLICY "Authenticated users can manage generation jobs"
  ON generation_jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
