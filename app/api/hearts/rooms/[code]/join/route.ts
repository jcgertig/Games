import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** POST /api/hearts/rooms/[code]/join — join an open bot seat. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = serviceClient();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find room
  const { data: room } = await sb
    .from('hearts_rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.status !== 'waiting')
    return NextResponse.json({ error: 'Game already started' }, { status: 409 });

  // Check user isn't already seated
  const { data: existing } = await sb
    .from('hearts_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ yourSeat: existing.seat });

  // Find the first open bot seat
  const { data: seats } = await sb
    .from('hearts_seats')
    .select('seat, is_bot')
    .eq('room_id', room.id)
    .order('seat');
  const openSeat = seats?.find((s) => s.is_bot)?.seat;
  if (openSeat === undefined)
    return NextResponse.json({ error: 'Room is full' }, { status: 409 });

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Player';

  // Replace the bot seat with this user
  await sb
    .from('hearts_seats')
    .update({ user_id: user.id, display_name: displayName, is_bot: false })
    .eq('room_id', room.id)
    .eq('seat', openSeat);

  // Update player name in game state
  const { data: gs } = await sb
    .from('hearts_game_state')
    .select('state')
    .eq('room_id', room.id)
    .single();
  if (gs?.state) {
    const newState = { ...gs.state };
    newState.playerNames[openSeat] = displayName;
    newState.isBot[openSeat] = false;
    await sb.from('hearts_game_state').update({ state: newState }).eq('room_id', room.id);
  }

  return NextResponse.json({ yourSeat: openSeat });
}
