import { createClient } from '@/lib/supabase/server';
import { runGeneration } from '@/lib/generation/runner';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Admin check
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topic, categoryId } = await request.json();

  if (!topic || topic.trim().length < 3) {
    return NextResponse.json({ error: 'Topic is required (min 3 chars)' }, { status: 400 });
  }

  // Get category name for prompt
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('generation_jobs')
    .insert({
      topic: topic.trim(),
      category_id: categoryId,
      status: 'pending',
    })
    .select()
    .single();

  if (jobError) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }

  // Start generation in background (fire and forget)
  // The actual generation runs asynchronously
  runGeneration(job.id, topic.trim(), category?.name || 'General', supabase);

  return NextResponse.json({ jobId: job.id });
}
