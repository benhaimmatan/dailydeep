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
    .select('id, name, slug, day_of_week')
    .order('day_of_week');

  // Get today's category
  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayCategory = categories?.find(c => c.day_of_week === dayOfWeek);

  return (
    <GenerationPage
      categories={categories || []}
      defaultCategoryId={todayCategory?.id}
    />
  );
}
