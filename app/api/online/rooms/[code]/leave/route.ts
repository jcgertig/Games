import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getGameConfig } from '../../../_registry';
import type { SpectatorInfo } from '@/lib/online-rooms/types';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * POST /api/online/rooms/[code]/leave
 *
 * Body: { spectate?: boolean }
 *   spectate=false (default) — remove player from the room entirely; client redirects to lobby
 *   spectate=true  — replace seat with bot but keep the user as a standby viewer
 *
 * If the caller is already a spectator: spectate=false removes them; spectate=true is a no-op.
 * The room owner cannot use this endpoint (use /close instead).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = serviceClient();
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const spectate = Boolean((body as any)?.spectate);

  const { data: room } = await sb
    .from('online_rooms')
    .select('id, game_slug, status, owner_id, spectators')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.owner_id === user.id)
    return NextResponse.json({ error: 'Owner must use /close instead' }, { status: 403 });

  const spectators: SpectatorInfo[] = (room as any).spectators ?? [];
  const isCurrentlySpectator = spectators.some(s => s.user_id === user.id);

  // ── Path A: user is already a spectator (no seat) ─────────────────────────
  if (isCurrentlySpectator) {
    if (!spectate) {
      // Remove from spectators list — user is fully leaving
      const newSpectators = spectators.filter(s => s.user_id !== user.id);
      await sb.from('online_rooms').update({ spectators: newSpectators }).eq('id', room.id);
    }
    // spectate=true is a no-op (already a spectator); spectate=false removes them
    return NextResponse.json({ ok: true, isSpectator: spectate });
  }

  // ── Path B: user has a seat ────────────────────────────────────────────────
  const { data: seatRow } = await sb
    .from('online_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!seatRow) {
    // Neither a spectator nor a seated player — nothing to do
    return NextResponse.json({ ok: true, isSpectator: false });
  }

  const seatNum = seatRow.seat;
  const config  = getGameConfig(room.game_slug);
  const botName = config.defaultBotNames[seatNum - 1] ?? `Bot ${seatNum}`;

  // Replace seat with a bot
  await sb
    .from('online_seats')
    .update({ user_id: null, display_name: botName, is_bot: true })
    .eq('room_id', room.id)
    .eq('seat', seatNum);

  // If game is in progress, patch the game state
  if (room.status === 'playing') {
    const { data: gs } = await sb
      .from('online_game_state')
      .select('state')
      .eq('room_id', room.id)
      .single();

    if (gs?.state) {
      try {
        const newState = config.replaceWithBot
          ? config.replaceWithBot(gs.state, seatNum, botName)
          : gs.state;
        await sb.from('online_game_state').update({ state: newState }).eq('room_id', room.id);
      } catch { /* non-fatal — game continues with stale name */ }
    }
  }

  // If spectate=true, add user to spectators so they can keep watching
  if (spectate) {
    const displayName =
      user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Viewer';
    const newSpectators: SpectatorInfo[] = [
      ...spectators,
      { user_id: user.id, display_name: displayName },
    ];
    await sb.from('online_rooms').update({ spectators: newSpectators }).eq('id', room.id);
  }

  return NextResponse.json({ ok: true, isSpectator: spectate });
}
