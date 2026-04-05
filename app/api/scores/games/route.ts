import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: games, error } = await supabase
    .from('games')
    .select(`
      slug,
      name,
      ladders (
        slug,
        name,
        score_type
      )
    `)
    .eq('is_active', true)
    .eq('ladders.is_active', true)
    .order('created_at');

  if (error) {
    console.error('[games] query error:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }

  return NextResponse.json(
    { games: games ?? [] },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300',
      },
    }
  );
}
