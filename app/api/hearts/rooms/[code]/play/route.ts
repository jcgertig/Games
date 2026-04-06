import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { humanPlay } from '../../../_game';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** POST /api/hearts/rooms/[code]/play — play a card. Body: { card: string } */
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

  let body: { card?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.card) return NextResponse.json({ error: 'Missing card' }, { status: 400 });

  // Find room + caller's seat
  const { data: room } = await sb
    .from('hearts_rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.status !== 'playing')
    return NextResponse.json({ error: 'Game not in progress' }, { status: 409 });

  const { data: seat } = await sb
    .from('hearts_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!seat) return NextResponse.json({ error: 'Not in this room' }, { status: 403 });

  // Load state, validate, apply play + bot turns
  const { data: gs } = await sb
    .from('hearts_game_state')
    .select('state')
    .eq('room_id', room.id)
    .single();
  if (!gs) return NextResponse.json({ error: 'State not found' }, { status: 500 });

  let newState;
  try {
    newState = humanPlay(gs.state, seat.seat, body.card);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 422 });
  }

  // Persist (triggers Realtime broadcast to all subscribers)
  await sb
    .from('hearts_game_state')
    .update({ state: newState, updated_at: new Date().toISOString() })
    .eq('room_id', room.id);

  // Mark room done if game over
  if (newState.phase === 'game_over') {
    await sb.from('hearts_rooms').update({ status: 'done' }).eq('id', room.id);
  }

  return NextResponse.json({ ok: true });
}
