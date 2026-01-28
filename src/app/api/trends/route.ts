import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTrendingTopicsForAdmin } from '@/lib/topics/selector';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Admin check - only admins should query trends
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get category from query params
  const { searchParams } = new URL(request.url);
  const categoryName = searchParams.get('category') || '';

  if (!categoryName) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  try {
    // Get trending topics using multi-source aggregation
    const trendingTopics = await getTrendingTopicsForAdmin(categoryName, supabase);

    // Transform to match expected format for TopicSelector component
    const trends = trendingTopics.map(t => ({
      title: t.topic,
      traffic: `${t.sourceCount} sources`,
      hotnessScore: t.hotnessScore,
      sources: t.sources,
      sampleHeadlines: t.sampleHeadlines,
      firstSeenHoursAgo: t.firstSeenHoursAgo,
    }));

    return NextResponse.json({
      category: categoryName,
      trends,
      totalFound: trends.length,
      filtered: 0,
    });
  } catch (err) {
    console.error('Trends API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch trends', trends: [] },
      { status: 200 } // Return 200 with empty trends to allow fallback
    );
  }
}
