import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Filter } from 'bad-words';
import { validateDisplayNameFormat } from '@/lib/display-name';

const filter = new Filter();

export async function PATCH(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace('Bearer ', '');
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── Validate format ───────────────────────────────────────────────────────
  const formatResult = validateDisplayNameFormat(body?.displayName ?? '');
  if (!formatResult.ok) {
    return NextResponse.json({ error: formatResult.error }, { status: 422 });
  }

  // ── Profanity check ───────────────────────────────────────────────────────
  if (filter.isProfane(formatResult.name)) {
    return NextResponse.json(
      { error: 'Display name contains inappropriate content.' },
      { status: 422 }
    );
  }

  // ── Persist to user_metadata ──────────────────────────────────────────────
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, display_name: formatResult.name },
  });

  if (updateError) {
    console.error('[display-name] update error:', updateError);
    return NextResponse.json({ error: 'Failed to update display name.' }, { status: 500 });
  }

  // ── Sync leaderboard entries ──────────────────────────────────────────────
  // Update all historical leaderboard rows so the new name shows immediately.
  const { error: leaderboardError } = await supabase
    .from('leaderboard_entries')
    .update({ display_name: formatResult.name })
    .eq('user_id', user.id);

  if (leaderboardError) {
    // Non-fatal: auth metadata was updated successfully; log and continue.
    console.error('[display-name] leaderboard sync error:', leaderboardError);
  }

  return NextResponse.json({ displayName: formatResult.name });
}
