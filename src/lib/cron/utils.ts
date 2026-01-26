import { SupabaseClient } from '@supabase/supabase-js';
import { CronRun } from '@/types/database';

/**
 * Check if a report has already been published today (UTC)
 */
export async function hasReportForToday(
  supabase: SupabaseClient
): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .gte('published_at', today.toISOString())
    .lt('published_at', tomorrow.toISOString());

  return (count ?? 0) > 0;
}

/**
 * Check if any generation job is currently in progress
 */
export async function hasInProgressJob(
  supabase: SupabaseClient
): Promise<boolean> {
  const { count } = await supabase
    .from('generation_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'generating');

  return (count ?? 0) > 0;
}

/**
 * Mark stuck jobs as failed (generating for >30 minutes)
 */
export async function cleanupStuckJobs(
  supabase: SupabaseClient
): Promise<void> {
  const thirtyMinutesAgo = new Date();
  thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

  await supabase
    .from('generation_jobs')
    .update({
      status: 'failed',
      error: 'Job timed out (stuck for >30 minutes)',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'generating')
    .lt('started_at', thirtyMinutesAgo.toISOString());
}

/**
 * Log a cron run to the database
 */
export async function logCronRun(
  supabase: SupabaseClient,
  data: Partial<CronRun>
): Promise<void> {
  await supabase.from('cron_runs').insert(data);
}
