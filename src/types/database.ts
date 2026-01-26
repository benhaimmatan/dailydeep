/**
 * The Daily Deep - Database Types
 * TypeScript interfaces matching the Supabase schema
 */

/**
 * Source reference for report citations
 */
export interface Source {
  name: string
  url: string
}

/**
 * Report status enum values
 */
export type ReportStatus = 'draft' | 'published' | 'generating'

/**
 * Category representing a daily topic theme
 */
export interface Category {
  id: string
  name: string
  slug: string
  day_of_week: number // 0=Sunday, 6=Saturday
  created_at: string
}

/**
 * Investigative report content and metadata
 */
export interface Report {
  id: string
  slug: string
  title: string
  subtitle: string | null
  content: string
  summary: string | null
  category_id: string | null
  status: ReportStatus
  published_at: string | null
  word_count: number | null
  reading_time: number | null
  sources: Source[] | null
  regions: string[] | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
  created_at: string
  updated_at: string
}

/**
 * Report with joined category data
 */
export interface ReportWithCategory extends Report {
  category: Category | null
}

/**
 * Topic history entry for preventing repetition
 */
export interface TopicHistory {
  id: string
  topic: string
  category_id: string | null
  report_id: string | null
  used_at: string
}

/**
 * Generation job status enum values
 */
export type GenerationJobStatus = 'pending' | 'generating' | 'validating' | 'completed' | 'failed'

/**
 * Generation job for async report generation tracking
 */
export interface GenerationJob {
  id: string
  topic: string
  category_id: string | null
  status: GenerationJobStatus
  progress: string | null
  error: string | null
  report_id: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

/**
 * Cron run status enum values
 */
export type CronRunStatus = 'success' | 'skipped' | 'failed'

/**
 * Cron run execution record for tracking automated generation
 */
export interface CronRun {
  id: string
  started_at: string
  completed_at: string | null
  status: CronRunStatus
  topic: string | null
  category_name: string | null
  report_id: string | null
  error: string | null
  skip_reason: string | null
  created_at: string
}

/**
 * Database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      reports: {
        Row: Report
        Insert: Omit<Report, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Report, 'id' | 'created_at' | 'updated_at'>>
      }
      topic_history: {
        Row: TopicHistory
        Insert: Omit<TopicHistory, 'id' | 'used_at'>
        Update: Partial<Omit<TopicHistory, 'id' | 'used_at'>>
      }
      generation_jobs: {
        Row: GenerationJob
        Insert: Omit<GenerationJob, 'id' | 'created_at' | 'started_at'>
        Update: Partial<Omit<GenerationJob, 'id' | 'created_at'>>
      }
    }
  }
}
