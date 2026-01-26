-- Cron run history for dashboard visibility and debugging
CREATE TABLE cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'failed')),
  topic TEXT,
  category_name TEXT,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  error TEXT,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent runs query (dashboard displays last 30 days)
CREATE INDEX idx_cron_runs_started ON cron_runs(started_at DESC);

-- RLS policies
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin) can read cron runs
CREATE POLICY "Authenticated users can read cron runs"
  ON cron_runs FOR SELECT TO authenticated USING (true);

-- Allow inserts for cron runs (CRON_SECRET validated at API level)
CREATE POLICY "Allow insert for cron runs"
  ON cron_runs FOR INSERT WITH CHECK (true);
