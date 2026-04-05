import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

interface SubmitBody {
  gameSlug: string;
  ladderSlug: string;
  primaryValue: number;
  secondaryValue?: number;
  metadata?: Record<string, unknown>;
  clientTs?: string;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace('Bearer ', '');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify the user's JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    // Also try cookie-based session (for SSR flows)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const userId = user?.id ?? (await supabase.auth.getSession()).data.session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { gameSlug, ladderSlug, primaryValue, secondaryValue, metadata, clientTs } = body;

  if (!gameSlug || !ladderSlug || primaryValue == null) {
    return NextResponse.json(
      { error: 'Missing required fields: gameSlug, ladderSlug, primaryValue' },
      { status: 400 }
    );
  }

  // ── Resolve ladder ID (two-step: game → ladder) ──────────────────────────
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
    .select('id')
    .eq('slug', ladderSlug)
    .eq('game_id', game.id)
    .eq('is_active', true)
    .single();

  if (!ladderRow) {
    return NextResponse.json({ error: `Ladder not found: ${ladderSlug}` }, { status: 404 });
  }

  // ── Get display name ──────────────────────────────────────────────────────
  const { data: { user: fullUser } } = await supabase.auth.admin.getUserById(userId);
  const displayName =
    fullUser?.user_metadata?.display_name ??
    fullUser?.email?.split('@')[0] ??
    'Player';

  // ── Upsert via RPC ────────────────────────────────────────────────────────
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'upsert_leaderboard_entry',
    {
      p_ladder_id:       ladderRow.id,
      p_user_id:         userId,
      p_display_name:    displayName,
      p_primary_value:   primaryValue,
      p_secondary_value: secondaryValue ?? null,
      p_metadata:        metadata ?? {},
    }
  );

  if (rpcError) {
    console.error('[submit] RPC error:', rpcError);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }

  // ── Write audit log ───────────────────────────────────────────────────────
  await supabase.from('score_submissions').insert({
    ladder_id:       ladderRow.id,
    user_id:         userId,
    primary_value:   primaryValue,
    secondary_value: secondaryValue ?? null,
    metadata:        metadata ?? {},
    client_ts:       clientTs ?? null,
    was_improvement: rpcResult?.is_improvement ?? false,
  });

  return NextResponse.json({
    isImprovement: rpcResult?.is_improvement ?? false,
    rank:          rpcResult?.rank ?? 1,
  });
}
