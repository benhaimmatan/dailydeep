import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { runGeneration } from '@/lib/generation/runner';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[generate] Auth error:', authError);
      return NextResponse.json({ error: 'Auth failed', details: authError.message }, { status: 500 });
    }

    // Admin check
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      console.error('[generate] Unauthorized:', user?.email, 'expected:', process.env.ADMIN_EMAIL);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[generate] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { topic, categoryId } = body;

    if (!topic || topic.trim().length < 3) {
      return NextResponse.json({ error: 'Topic is required (min 3 chars)' }, { status: 400 });
    }

    // Get category name for prompt
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      console.error('[generate] Category fetch error:', categoryError);
    }

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
      console.error('[generate] Job creation error:', jobError);
      return NextResponse.json({ error: 'Failed to create job', details: jobError.message }, { status: 500 });
    }

    // Start generation in background using waitUntil to keep function alive
    // This allows Vercel serverless to complete the async work after returning response
    // Use service role client to bypass RLS for write operations
    const serviceClient = createServiceRoleClient();
    waitUntil(runGeneration(job.id, topic.trim(), category?.name || 'General', serviceClient));

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error('[generate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
