-- The Daily Deep - Initial Schema
-- This migration creates the core tables for the daily investigative report system

-- ============================================================================
-- CATEGORIES TABLE
-- Stores the 7 daily topic categories with their day-of-week assignments
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for day lookup
CREATE INDEX idx_categories_day_of_week ON categories(day_of_week);

-- ============================================================================
-- REPORTS TABLE
-- Stores the investigative reports with their content and metadata
-- ============================================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'generating')),
  published_at TIMESTAMPTZ,
  word_count INT,
  reading_time INT,
  sources JSONB,
  regions TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_published_at ON reports(published_at DESC);
CREATE INDEX idx_reports_category_id ON reports(category_id);
CREATE INDEX idx_reports_slug ON reports(slug);

-- ============================================================================
-- TOPIC HISTORY TABLE
-- Tracks previously used topics to prevent repetition
-- ============================================================================
CREATE TABLE topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for topic lookups
CREATE INDEX idx_topic_history_category_id ON topic_history(category_id);
CREATE INDEX idx_topic_history_used_at ON topic_history(used_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS and create policies for secure access
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_history ENABLE ROW LEVEL SECURITY;

-- Categories: Public read access (reference data)
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO anon
  USING (true);

-- Reports: Public can only read published reports
CREATE POLICY "Anyone can read published reports"
  ON reports
  FOR SELECT
  TO anon
  USING (status = 'published');

-- Topic history: No anonymous access (internal use only)
-- Service role will be used for write operations

-- ============================================================================
-- SEED DATA: 7 Daily Categories
-- ============================================================================
INSERT INTO categories (name, slug, day_of_week) VALUES
  ('Geopolitics', 'geopolitics', 0),    -- Sunday
  ('Economics', 'economics', 1),        -- Monday
  ('Technology', 'technology', 2),      -- Tuesday
  ('Climate', 'climate', 3),            -- Wednesday
  ('Society', 'society', 4),            -- Thursday
  ('Science', 'science', 5),            -- Friday
  ('Conflict', 'conflict', 6);          -- Saturday

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
