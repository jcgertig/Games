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
 * POST /api/online/rooms/[code]/claim-seat
 *
 * Allows a standby spectator to claim an open bot seat.
 * Race condition is handled via optimistic concurrency: the UPDATE includes
 * `is_bot = true` as a guard, so only the first writer succeeds.
 * Returns { yourSeat: number } on success or { error: 'seat_taken' } if lost the race.
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

  const { data: room } = await sb
    .from('online_rooms')
    .select('id, game_slug, status, spectators')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const spectators: SpectatorInfo[] = (room as any).spectators ?? [];
  const spectatorInfo = spectators.find(s => s.user_id === user.id);
  if (!spectatorInfo)
    return NextResponse.json({ error: 'Only spectators can claim a seat' }, { status: 403 });

  // Find available bot seats
  const { data: botSeats } = await sb
    .from('online_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('is_bot', true);

  if (!botSeats || botSeats.length === 0)
    return NextResponse.json({ error: 'seat_taken' });

  // Pick a random bot seat to distribute load when multiple spectators compete
  const targetSeat =
    botSeats[Math.floor(Math.random() * botSeats.length)].seat;
  const displayName = spectatorInfo.display_name;

  // Atomic claim: the WHERE includes is_bot=true, so if another client won the
  // race and already flipped it to false, this UPDATE touches 0 rows.
  await sb
    .from('online_seats')
    .update({ user_id: user.id, display_name: displayName, is_bot: false })
    .eq('room_id', room.id)
    .eq('seat', targetSeat)
    .eq('is_bot', true);

  // Verify claim succeeded
  const { data: verify } = await sb
    .from('online_seats')
    .select('seat, is_bot, user_id')
    .eq('room_id', room.id)
    .eq('seat', targetSeat)
    .single();

  if (!verify || verify.is_bot || verify.user_id !== user.id)
    return NextResponse.json({ error: 'seat_taken' });

  // Remove from spectators
  const newSpectators = spectators.filter(s => s.user_id !== user.id);
  await sb.from('online_rooms').update({ spectators: newSpectators }).eq('id', room.id);

  // Update game state so the engine knows it's a human seat again
  if (room.status === 'playing') {
    const { data: gs } = await sb
      .from('online_game_state')
      .select('state')
      .eq('room_id', room.id)
      .single();

    if (gs?.state) {
      try {
        const config = getGameConfig(room.game_slug);
        const newState = config.restoreHuman
          ? config.restoreHuman(gs.state, targetSeat, displayName)
          : config.patchPlayerName(gs.state, targetSeat, displayName);
        await sb.from('online_game_state').update({ state: newState }).eq('room_id', room.id);
      } catch { /* non-fatal */ }
    }
  }

  return NextResponse.json({ yourSeat: targetSeat });
}
