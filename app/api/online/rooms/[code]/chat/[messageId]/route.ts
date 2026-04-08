import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'bad-words';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const profanityFilter = new Filter();

type Params = { params: Promise<{ code: string; messageId: string }> };

/**
 * PATCH /api/online/rooms/[code]/chat/[messageId]
 *
 * Body: { body: string }
 *
 * Edits an existing message. Only the original sender can edit.
 * Deleted messages cannot be edited.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { messageId } = await params;
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

  const { data: existing } = await sb
    .from('online_chat_messages')
    .select('id, user_id, deleted_at')
    .eq('id', messageId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (existing.deleted_at) return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 422 });

  const { data: message, error: updateErr } = await sb
    .from('online_chat_messages')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single();

  if (updateErr || !message) {
    return NextResponse.json({ error: updateErr?.message ?? 'Failed to edit message' }, { status: 500 });
  }

  return NextResponse.json({ message });
}

/**
 * DELETE /api/online/rooms/[code]/chat/[messageId]
 *
 * Soft-deletes a message (sets body=NULL, deleted_at=now()).
 * Only the original sender can delete their own messages.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { messageId } = await params;
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = serviceClient();
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await sb
    .from('online_chat_messages')
    .select('id, user_id, deleted_at')
    .eq('id', messageId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (existing.deleted_at) return NextResponse.json({ error: 'Message already deleted' }, { status: 409 });

  await sb
    .from('online_chat_messages')
    .update({ body: null, deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  return NextResponse.json({ ok: true });
}
