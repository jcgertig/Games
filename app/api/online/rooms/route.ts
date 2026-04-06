import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getGameConfig } from '../_registry';

// ── Supabase service client ───────────────────────────────────────────────────

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ── Code generation ───────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 (ambiguous)

function randomCode() {
  return Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

async function generateCode(sb: ReturnType<typeof serviceClient>, gameSlug: string) {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const { data } = await sb
      .from('online_rooms')
      .select('id')
      .eq('game_slug', gameSlug)
      .eq('code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Failed to generate unique room code');
}

// ── Route ─────────────────────────────────────────────────────────────────────

/** POST /api/online/rooms — create a new room for any registered game. */
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = serviceClient();
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { gameSlug?: string };
  try { body = await req.json(); } catch { body = {}; }

  const { gameSlug } = body;
  if (!gameSlug) return NextResponse.json({ error: 'gameSlug required' }, { status: 400 });

  let config: ReturnType<typeof getGameConfig>;
  try { config = getGameConfig(gameSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 404 }); }

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Player';

  let code: string;
  try { code = await generateCode(sb, gameSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }

  // Create room
  const { data: room, error: roomErr } = await sb
    .from('online_rooms')
    .insert({ game_slug: gameSlug, code, owner_id: user.id, max_seats: config.maxSeats })
    .select('id')
    .single();
  if (roomErr || !room)
    return NextResponse.json({ error: roomErr?.message ?? 'Failed to create room' }, { status: 500 });

  // Seat 0 = creator, remaining seats = bots
  const seats = Array.from({ length: config.maxSeats }, (_, i) =>
    i === 0
      ? { room_id: room.id, seat: 0, user_id: user.id, display_name: displayName, is_bot: false }
      : { room_id: room.id, seat: i, display_name: config.defaultBotNames[i - 1] ?? `Bot ${i}`, is_bot: true },
  );
  await sb.from('online_seats').insert(seats);

  // Write initial waiting state
  const playerNames = seats.map(s => s.display_name);
  const isBot       = seats.map(s => s.is_bot);
  const state       = config.createWaitingState(playerNames, isBot);
  await sb.from('online_game_state').insert({ room_id: room.id, state });

  return NextResponse.json({ code, roomId: room.id, yourSeat: 0 });
}
