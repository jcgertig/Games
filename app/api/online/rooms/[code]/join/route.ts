import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getGameConfig } from '../../../_registry';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** POST /api/online/rooms/[code]/join — join an open bot seat, or rejoin existing seat. */
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
    .select('id, game_slug, status')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.status === 'done') return NextResponse.json({ error: 'Game is over' }, { status: 409 });

  // Check existing seat first — always allow rejoining regardless of game status
  const { data: existing } = await sb
    .from('online_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ yourSeat: existing.seat });

  // Only allow claiming a new seat while the game hasn't started
  if (room.status !== 'waiting')
    return NextResponse.json({ error: 'Game already started' }, { status: 409 });

  // Find the first open bot seat
  const { data: seats } = await sb
    .from('online_seats')
    .select('seat, is_bot')
    .eq('room_id', room.id)
    .order('seat');
  const openSeat = seats?.find(s => s.is_bot)?.seat;
  if (openSeat === undefined)
    return NextResponse.json({ error: 'Room is full' }, { status: 409 });

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Player';

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
      const newState = config.patchPlayerName(gs.state, openSeat, displayName);
      await sb.from('online_game_state').update({ state: newState }).eq('room_id', room.id);
    } catch {
      // Non-fatal: game can still proceed with stale player name
    }
  }

  return NextResponse.json({ yourSeat: openSeat });
}
