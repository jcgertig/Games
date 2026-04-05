import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getLadderConfig } from '@/lib/scores/config/ladders';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameSlug   = searchParams.get('gameSlug');
  const ladderSlug = searchParams.get('ladderSlug');
  const limit      = Math.min(parseInt(searchParams.get('limit')  ?? '50'), 100);
  const offset     = parseInt(searchParams.get('offset') ?? '0');

  if (!gameSlug || !ladderSlug) {
    return NextResponse.json(
      { error: 'Missing required query params: gameSlug, ladderSlug' },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Resolve ladder
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('slug', gameSlug)
    .eq('is_active', true)
    .single();

  if (!game) {
    return NextResponse.json({ error: `Game not found: ${gameSlug}` }, { status: 404 });
  }

  const { data: ladderRow } = await supabase
    .from('ladders')
    .select('id, slug, name, score_type, primary_label, secondary_label, sort_primary, sort_secondary')
    .eq('slug', ladderSlug)
    .eq('game_id', game.id)
    .eq('is_active', true)
    .single();

  if (!ladderRow) {
    return NextResponse.json({ error: `Ladder not found: ${ladderSlug}` }, { status: 404 });
  }

  // Determine the current user (if any) for isCurrentUser flag
  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace('Bearer ', '');
  let currentUserId: string | null = null;
  if (accessToken) {
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    currentUserId = user?.id ?? null;
  }

  // Fetch entries ordered by sort direction
  const orderColumn  = 'primary_value';
  const isDesc       = ladderRow.sort_primary === 'desc';
  const secOrderCol  = 'secondary_value';
  const secIsDesc    = (ladderRow.sort_secondary ?? 'desc') === 'desc';

  const { data: rows, error, count } = await supabase
    .from('leaderboard_entries')
    .select('user_id, display_name, primary_value, secondary_value, metadata, submitted_at', { count: 'exact' })
    .eq('ladder_id', ladderRow.id)
    .order(orderColumn, { ascending: !isDesc, nullsFirst: false })
    .order(secOrderCol, { ascending: !secIsDesc, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[leaderboard] query error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  // Assign ranks (ties get the same rank)
  const entries = (rows ?? []).map((row, idx) => ({
    rank:           offset + idx + 1,
    userId:         row.user_id,
    displayName:    row.display_name,
    primaryValue:   row.primary_value,
    secondaryValue: row.secondary_value ?? undefined,
    metadata:       row.metadata ?? {},
    submittedAt:    row.submitted_at,
    isCurrentUser:  row.user_id === currentUserId,
  }));

  // Merge with client-side ladder config for labels
  const clientConfig = getLadderConfig(gameSlug, ladderSlug);

  const ladderOut = {
    gameSlug,
    ladderSlug,
    name:          ladderRow.name,
    scoreType:     ladderRow.score_type,
    primaryLabel:  clientConfig?.primaryLabel  ?? ladderRow.primary_label,
    secondaryLabel: clientConfig?.secondaryLabel ?? ladderRow.secondary_label ?? undefined,
    sortPrimary:   ladderRow.sort_primary,
    sortSecondary: ladderRow.sort_secondary ?? undefined,
  };

  return NextResponse.json(
    { ladder: ladderOut, entries, total: count ?? 0 },
    {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    }
  );
}
