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

/** POST /api/online/rooms/[code]/join — join an open bot seat, rejoin existing seat, or become a spectator. */
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

  const { data: room } = await sb
    .from('online_rooms')
    .select('id, game_slug, status, spectators')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.status === 'done') return NextResponse.json({ error: 'Game is over' }, { status: 409 });

  const spectators: SpectatorInfo[] = (room as any).spectators ?? [];

  // Check existing seat first — always allow rejoining regardless of game status
  const { data: existing } = await sb
    .from('online_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ yourSeat: existing.seat, spectator: false });

  // Check if already a spectator (e.g. after "Watch Only")
  if (spectators.some(s => s.user_id === user.id))
    return NextResponse.json({ yourSeat: null, spectator: true });

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Player';

  // Find the first open bot seat
  const { data: seats } = await sb
    .from('online_seats')
    .select('seat, is_bot')
    .eq('room_id', room.id)
    .order('seat');
  const openSeat = seats?.find(s => s.is_bot)?.seat;

  if (openSeat === undefined) {
    if (room.status !== 'waiting') {
      // Game in progress, no bot seats — become a spectator
      const newSpectators: SpectatorInfo[] = [
        ...spectators,
        { user_id: user.id, display_name: displayName },
      ];
      await sb.from('online_rooms').update({ spectators: newSpectators }).eq('id', room.id);
      return NextResponse.json({ yourSeat: null, spectator: true });
    }
    return NextResponse.json({ error: 'Room is full' }, { status: 409 });
  }

  if (room.status !== 'waiting' && room.status !== 'playing') {
    return NextResponse.json({ error: 'Cannot join at this stage' }, { status: 409 });
  }

  // Claim the bot seat
  await sb
    .from('online_seats')
    .update({ user_id: user.id, display_name: displayName, is_bot: false })
    .eq('room_id', room.id)
    .eq('seat', openSeat);

  // Update player metadata in game state via the game config
  const { data: gs } = await sb
    .from('online_game_state')
    .select('state')
    .eq('room_id', room.id)
    .single();
  if (gs?.state) {
    try {
      const config = getGameConfig(room.game_slug);
      const patchFn = room.status === 'playing' && config.restoreHuman
        ? (s: unknown, seat: number, name: string) => config.restoreHuman!(s as any, seat, name)
        : (s: unknown, seat: number, name: string) => config.patchPlayerName(s as any, seat, name);
      const newState = patchFn(gs.state, openSeat, displayName);
      await sb.from('online_game_state').update({ state: newState }).eq('room_id', room.id);
    } catch {
      // Non-fatal: game can still proceed with stale player name
    }
  }

  return NextResponse.json({ yourSeat: openSeat, spectator: false });
}
