import { SupabaseClient } from '@supabase/supabase-js';
import { generateReport } from '@/lib/gemini/client';

/**
 * Run the full generation workflow: AI generation -> validation -> save to database
 * Uses fire-and-forget pattern - caller receives immediate response while this runs async
 */
export async function runGeneration(
  jobId: string,
  topic: string,
  categoryName: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Update status to generating
    await supabase
      .from('generation_jobs')
      .update({
        status: 'generating',
        progress: 'Starting AI generation...',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Generate report with progress updates
    const report = await generateReport(topic, categoryName, async (message) => {
      await supabase
        .from('generation_jobs')
        .update({ progress: message })
        .eq('id', jobId);
    });

    // Update status to validating
    await supabase
      .from('generation_jobs')
      .update({ status: 'validating', progress: 'Saving report...' })
      .eq('id', jobId);

    // Get category ID
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    // Create slug from title
    const slug = report.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Save report to database
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
        category_id: category?.id,
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
      category_id: category?.id,
      report_id: savedReport.id,
    });

    // Mark job as completed
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
    // Mark job as failed
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
