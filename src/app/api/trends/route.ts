import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTrendsByCategory, filterUsedTopics } from '@/lib/trends/client';

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
    // Get trending topics for category
    const trends = await getTrendsByCategory(categoryName, 'US');

    // Get recently used topics from topic_history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: usedTopics } = await supabase
      .from('topic_history')
      .select('topic')
      .gte('used_at', thirtyDaysAgo.toISOString());

    // Filter out recently used topics
    const usedTopicsList = (usedTopics || []).map((t) => t.topic);
    const filteredTrends = filterUsedTopics(trends, usedTopicsList);

    return NextResponse.json({
      category: categoryName,
      trends: filteredTrends,
      totalFound: trends.length,
      filtered: trends.length - filteredTrends.length,
    });
  } catch (err) {
    console.error('Trends API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch trends', trends: [] },
      { status: 200 } // Return 200 with empty trends to allow fallback
    );
  }
}
