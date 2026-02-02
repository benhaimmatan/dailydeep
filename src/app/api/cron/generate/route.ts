import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { autoSelectTopic } from '@/lib/topics/selector';
import { runGeneration } from '@/lib/generation/runner';
import {
  hasReportForToday,
  hasInProgressJob,
  cleanupStuckJobs,
  logCronRun,
} from '@/lib/cron/utils';

export async function GET(request: NextRequest) {
  const startedAt = new Date().toISOString();
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient(); // For write operations (bypasses RLS)

  // 1. Validate CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Get day of week for category selection
  const today = new Date();
  const dayOfWeek = today.getUTCDay();

  // 3. Idempotency check - report already exists for today
  if (await hasReportForToday(supabase)) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'skipped',
      skip_reason: 'Report already generated today',
    });
    return NextResponse.json({ success: true, message: 'Already generated today' });
  }

  // 4. Cleanup stuck jobs and check for in-progress
  await cleanupStuckJobs(supabase);
  if (await hasInProgressJob(supabase)) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'skipped',
      skip_reason: 'Generation already in progress',
    });
    return NextResponse.json({ success: true, message: 'Generation in progress' });
  }

  // 5. Get today's category (day_of_week: 0=Sun for weekly generation)
  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (catError || !category) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'failed',
      error: `No category for day ${dayOfWeek}: ${catError?.message || 'not found'}`,
    });
    return NextResponse.json({ error: 'Category not found' }, { status: 500 });
  }

  // 6. Auto-select trending topic using multi-source aggregation
  console.log(`\n🔍 Auto-selecting topic for category: ${category.name}`);
  const topic = await autoSelectTopic(category.name, supabase);
  console.log(`📰 Selected topic: ${topic}`);

  // 7. Create generation job (use service client to bypass RLS)
  const { data: job, error: jobError } = await serviceClient
    .from('generation_jobs')
    .insert({
      topic,
      category_id: category.id,
      status: 'pending',
    })
    .select()
    .single();

  if (jobError || !job) {
    await logCronRun(supabase, {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'failed',
      topic,
      category_name: category.name,
      error: `Failed to create job: ${jobError?.message || 'unknown'}`,
    });
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }

  // 8. Log cron start
  await logCronRun(supabase, {
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    status: 'success',
    topic,
    category_name: category.name,
  });

  // 9. Start generation in background using waitUntil to keep function alive
  waitUntil(runGeneration(job.id, topic, category.name, serviceClient));

  return NextResponse.json({
    success: true,
    jobId: job.id,
    topic,
    category: category.name,
  });
}
