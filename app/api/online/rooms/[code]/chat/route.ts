import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'bad-words';
import type { SpectatorInfo } from '@/lib/online-rooms/types';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const profanityFilter = new Filter();

/**
 * POST /api/online/rooms/[code]/chat
 *
 * Body: { body: string }
 *
 * Sends a chat message to the room. Both seated players and spectators can
 * send messages. Rate limited to 3 messages per second per user.
 * Profanity is rejected (422).
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

  let body: { body?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const rawBody = body.body;
  if (typeof rawBody !== 'string' || rawBody.trim().length === 0) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
  }
  const trimmed = rawBody.trim();
  if (trimmed.length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 characters).' }, { status: 422 });
  }
  if (profanityFilter.isProfane(trimmed)) {
    return NextResponse.json({ error: 'Message contains inappropriate content.' }, { status: 422 });
  }

  // Fetch room
  const { data: room } = await sb
    .from('online_rooms')
    .select('id, spectators')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Membership check: must be a seated player or spectator
  const { data: seatRow } = await sb
    .from('online_seats')
    .select('seat')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const spectators: SpectatorInfo[] = (room as any).spectators ?? [];
  const isSpectator = spectators.some(s => s.user_id === user.id);

  if (!seatRow && !isSpectator) {
    return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });
  }

  // Rate limit: max 3 messages per user per second
  const { count } = await sb
    .from('online_chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('created_at', new Date(Date.now() - 1000).toISOString());

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 3 messages per second.' }, { status: 429 });
  }

  const displayName: string =
    user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Player';

  const { data: message, error: insertErr } = await sb
    .from('online_chat_messages')
    .insert({ room_id: room.id, user_id: user.id, display_name: displayName, body: trimmed })
    .select()
    .single();

  if (insertErr || !message) {
    return NextResponse.json({ error: insertErr?.message ?? 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
