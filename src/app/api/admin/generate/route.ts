import { createClient } from '@/lib/supabase/server';
import { generateReport } from '@/lib/gemini/client';
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

async function runGeneration(
  jobId: string,
  topic: string,
  categoryName: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    // Update to generating
    await supabase
      .from('generation_jobs')
      .update({ status: 'generating', progress: 'Starting AI generation...' })
      .eq('id', jobId);

    // Generate report with progress updates
    const report = await generateReport(topic, categoryName, async (message) => {
      await supabase
        .from('generation_jobs')
        .update({ progress: message })
        .eq('id', jobId);
    });

    // Update to validating
    await supabase
      .from('generation_jobs')
      .update({ status: 'validating', progress: 'Saving report...' })
      .eq('id', jobId);

    // Get category ID for the report
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    // Create slug from title
    const slug = report.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Save report
    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert({
        slug: `${slug}-${Date.now()}`,
        title: report.title,
        subtitle: report.subtitle,
        summary: report.summary,
        content: report.content,
        sources: report.sources,
        seo_title: report.seo_title,
        seo_description: report.seo_description,
        seo_keywords: report.seo_keywords,
        category_id: cat?.id,
        status: 'published',
        published_at: new Date().toISOString(),
        word_count: report.content.split(/\s+/).length,
        reading_time: Math.ceil(report.content.split(/\s+/).length / 200),
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Record in topic history
    await supabase.from('topic_history').insert({
      topic,
      category_id: cat?.id,
      report_id: savedReport.id,
    });

    // Mark complete
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        report_id: savedReport.id,
        progress: 'Report published successfully!',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error: errorMessage,
        progress: 'Generation failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
