import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { startGame } from '../../../_game';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** POST /api/hearts/rooms/[code]/start — deal cards and begin the game. */
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

  // Find room (caller must be the owner)
  const { data: room } = await sb
    .from('hearts_rooms')
    .select('id, status, owner_id')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.owner_id !== user.id)
    return NextResponse.json({ error: 'Only the host can start' }, { status: 403 });
  if (room.status !== 'waiting')
    return NextResponse.json({ error: 'Already started' }, { status: 409 });

  // Load current state and start the game
  const { data: gs } = await sb
    .from('hearts_game_state')
    .select('state')
    .eq('room_id', room.id)
    .single();
  if (!gs) return NextResponse.json({ error: 'State not found' }, { status: 500 });

  const newState = startGame(gs.state);

  // Persist: mark room as playing, save new state
  await Promise.all([
    sb.from('hearts_rooms').update({ status: 'playing' }).eq('id', room.id),
    sb.from('hearts_game_state')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('room_id', room.id),
  ]);

  return NextResponse.json({ ok: true });
}
