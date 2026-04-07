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

/** POST /api/online/rooms/[code]/start — room owner starts the game. */
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
    .select('id, game_slug, status, owner_id')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room)                     return NextResponse.json({ error: 'Room not found' },         { status: 404 });
  if (room.owner_id !== user.id) return NextResponse.json({ error: 'Only the host can start' }, { status: 403 });

  // Reject if the game is truly underway (phase advanced past 'waiting').
  // Allow re-calling when the room is already 'playing' but cards haven't been
  // dealt yet (phase === 'waiting') — this covers the "Ready / Deal Cards" case
  // where roomStatus flipped to 'playing' before the owner clicked the deal button.
  const alreadyPlaying = room.status === 'playing';
  if (room.status !== 'waiting' && !alreadyPlaying) {
    return NextResponse.json({ error: 'Game already started' }, { status: 409 });
  }

  let config: ReturnType<typeof getGameConfig>;
  try { config = getGameConfig(room.game_slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const { data: gs } = await sb
    .from('online_game_state')
    .select('state')
    .eq('room_id', room.id)
    .single();
  if (!gs) return NextResponse.json({ error: 'Game state not found' }, { status: 500 });

  // Guard: if the game state has already progressed past 'waiting', refuse.
  const currentPhase = (gs.state as any)?.phase;
  if (currentPhase && currentPhase !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 409 });
  }

  try {
    const newState = config.startGame(gs.state);
    await sb.from('online_game_state')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('room_id', room.id);
    // Only flip room status if it isn't already 'playing'.
    if (!alreadyPlaying) {
      await sb.from('online_rooms').update({ status: 'playing' }).eq('id', room.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Failed to start game' }, { status: 500 });
  }
}
