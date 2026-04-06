import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createWaitingState } from '../_game';

function makeCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** POST /api/hearts/rooms — create a new room with the caller in seat 0. */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = serviceClient();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Player';

  // Generate a unique 4-char code
  let code = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = makeCode();
    const { data } = await sb
      .from('hearts_rooms')
      .select('code')
      .eq('code', candidate)
      .maybeSingle();
    if (!data) { code = candidate; break; }
  }
  if (!code) return NextResponse.json({ error: 'Could not generate code' }, { status: 500 });

  // Create room
  const { data: room, error: roomErr } = await sb
    .from('hearts_rooms')
    .insert({ code, owner_id: user.id })
    .select('id')
    .single();
  if (roomErr || !room) {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }

  // Seat 0 = creator, seats 1-3 = bots
  const botNames = ['West Bot', 'North Bot', 'East Bot'];
  const seats = [
    { room_id: room.id, seat: 0, user_id: user.id, display_name: displayName, is_bot: false },
    ...botNames.map((name, i) => ({
      room_id: room.id, seat: i + 1, display_name: name, is_bot: true,
    })),
  ];
  await sb.from('hearts_seats').insert(seats);

  // Initialise empty game state
  const playerNames = [displayName, ...botNames];
  const isBot = [false, true, true, true];
  const state = createWaitingState(playerNames, isBot);
  await sb.from('hearts_game_state').insert({ room_id: room.id, state });

  return NextResponse.json({ code, roomId: room.id, yourSeat: 0 });
}
