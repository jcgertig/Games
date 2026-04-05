import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserId(req: NextRequest, supabase: SupabaseClient<any>): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace('Bearer ', '');
  if (accessToken) {
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (user) return user.id;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── GET /api/scores/player/stats?gameSlug= ────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameSlug = searchParams.get('gameSlug');

  if (!gameSlug) {
    return NextResponse.json({ error: 'Missing query param: gameSlug' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const userId = await getUserId(req, supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('slug', gameSlug)
    .single();

  if (!game) {
    return NextResponse.json({ error: `Game not found: ${gameSlug}` }, { status: 404 });
  }

  const { data: stats } = await supabase
    .from('player_stats')
    .select('plays, wins, losses, total_score, best_score, best_time, extra, last_played_at')
    .eq('game_id', game.id)
    .eq('user_id', userId)
    .single();

  if (!stats) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({
    plays:        stats.plays,
    wins:         stats.wins,
    losses:       stats.losses,
    totalScore:   stats.total_score,
    bestScore:    stats.best_score  ?? undefined,
    bestTime:     stats.best_time   ?? undefined,
    extra:        stats.extra       ?? {},
    lastPlayedAt: stats.last_played_at ?? undefined,
  });
}

// ── PATCH /api/scores/player/stats ────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const userId = await getUserId(req, supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { gameSlug: string; delta: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { gameSlug, delta } = body;
  if (!gameSlug || !delta) {
    return NextResponse.json({ error: 'Missing required fields: gameSlug, delta' }, { status: 400 });
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('slug', gameSlug)
    .single();

  if (!game) {
    return NextResponse.json({ error: `Game not found: ${gameSlug}` }, { status: 404 });
  }

  const { error } = await supabase.rpc('increment_player_stats', {
    p_game_id: game.id,
    p_user_id: userId,
    p_delta:   delta,
  });

  if (error) {
    console.error('[player/stats] RPC error:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
