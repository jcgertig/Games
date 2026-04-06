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

/**
 * POST /api/online/rooms/[code]/action — unified player action endpoint.
 * Body: { type: string, payload: unknown }
 *
 * Dispatches to the game config's applyAction, then marks the room done
 * if isGameOver returns true.
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

  let body: { type?: string; payload?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { type, payload = {} } = body;
  if (!type) return NextResponse.json({ error: 'action type required' }, { status: 400 });

  const { data: room } = await sb
    .from('online_rooms')
    .select('id, game_slug, status')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room)                      return NextResponse.json({ error: 'Room not found' },          { status: 404 });
  if (room.status !== 'playing')  return NextResponse.json({ error: 'Game is not in progress' }, { status: 409 });

  const { data: seatRow } = await sb
    .from('online_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!seatRow) return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });

  let config: ReturnType<typeof getGameConfig>;
  try { config = getGameConfig(room.game_slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  const { data: gs } = await sb
    .from('online_game_state')
    .select('state')
    .eq('room_id', room.id)
    .single();
  if (!gs) return NextResponse.json({ error: 'Game state not found' }, { status: 500 });

  try {
    const newState = config.applyAction(gs.state, seatRow.seat, { type, payload });
    await sb.from('online_game_state')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('room_id', room.id);

    if (config.isGameOver(newState)) {
      await sb.from('online_rooms').update({ status: 'done' }).eq('id', room.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Illegal action' }, { status: 422 });
  }
}
