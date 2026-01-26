import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GenerationPage } from './generation-page';

export default async function GeneratePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify admin access
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/admin/login');
  }

  // Fetch categories for the form
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, day_of_week')
    .order('day_of_week');

  // Get today's category based on day of week
  const dayOfWeek = new Date().getDay();
  const todayCategory = categories?.find(c => c.day_of_week === dayOfWeek);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold mb-2">Generate Test Report</h1>
      <p className="text-muted-foreground mb-8">
        This is for QA testing only. Select a trending topic or enter your own to generate an investigative report.
      </p>

      <GenerationPage
        categories={categories || []}
        todayCategoryId={todayCategory?.id || ''}
      />
    </div>
  );
}
