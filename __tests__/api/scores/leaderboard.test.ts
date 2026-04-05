import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { GET } from '@/app/api/scores/leaderboard/route';

function makeRequest(params: Record<string, string>, authHeader?: string) {
  const url = new URL('http://localhost/api/scores/leaderboard');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const VALID_LADDER_ROW = {
  id:              'ladder-id',
  slug:            'global',
  name:            'Global',
  score_type:      'composite',
  primary_label:   'Score',
  secondary_label: 'Accuracy %',
  sort_primary:    'desc',
  sort_secondary:  'desc',
};

const ENTRY_ROWS = [
  {
    user_id:         'user-a',
    display_name:    'Alice',
    primary_value:   500,
    secondary_value: 95,
    metadata:        { grade: 'S' },
    submitted_at:    '2026-01-01T00:00:00Z',
  },
  {
    user_id:         'user-b',
    display_name:    'Bob',
    primary_value:   300,
    secondary_value: 80,
    metadata:        { grade: 'A' },
    submitted_at:    '2026-01-02T00:00:00Z',
  },
];

describe('GET /api/scores/leaderboard', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when gameSlug is missing', async () => {
    const res = await GET(makeRequest({ ladderSlug: 'global' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required query params');
  });

  it('returns 400 when ladderSlug is missing', async () => {
    const res = await GET(makeRequest({ gameSlug: 'dancing-crab' }));
    expect(res.status).toBe(400);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns 404 when game not found', async () => {
    const gamesChain = buildChain({ single: { data: null, error: null } });
    mockClient.from.mockReturnValue(gamesChain);

    const res = await GET(makeRequest({ gameSlug: 'unknown', ladderSlug: 'global' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Game not found');
  });

  it('returns 404 when ladder not found', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: null, error: null } });
    mockClient.from.mockReturnValueOnce(gamesChain).mockReturnValueOnce(laddersChain);

    const res = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'missing' }));
    expect(res.status).toBe(404);
  });

  // ── DB error ──────────────────────────────────────────────────────────────

  it('returns 500 when leaderboard entries query fails', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({
      range: { data: null, error: new Error('db error'), count: 0 },
    });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to fetch leaderboard');
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('returns 200 with entries array and ladder info', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({
      range: { data: ENTRY_ROWS, error: null, count: 2 },
    });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0]).toMatchObject({
      rank:        1,
      userId:      'user-a',
      displayName: 'Alice',
      primaryValue: 500,
    });
  });

  it('assigns correct 1-based ranks', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: ENTRY_ROWS, error: null, count: 2 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res  = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }));
    const body = await res.json();
    expect(body.entries[0].rank).toBe(1);
    expect(body.entries[1].rank).toBe(2);
  });

  it('sets isCurrentUser=true for the authenticated user', async () => {
    const user = mockUser({ id: 'user-a' });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: ENTRY_ROWS, error: null, count: 2 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res  = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }, 'Bearer token'));
    const body = await res.json();

    expect(body.entries[0].isCurrentUser).toBe(true);   // user-a matches
    expect(body.entries[1].isCurrentUser).toBe(false);  // user-b does not
  });

  it('sets isCurrentUser=false for all entries when not authenticated', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: ENTRY_ROWS, error: null, count: 2 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res  = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }));
    const body = await res.json();
    expect(body.entries.every((e: { isCurrentUser: boolean }) => !e.isCurrentUser)).toBe(true);
  });

  it('uses limit and offset query params', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: [ENTRY_ROWS[1]], error: null, count: 2 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res  = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global', limit: '10', offset: '1' }));
    const body = await res.json();

    expect(body.entries[0].rank).toBe(2);   // offset 1 → rank starts at 2
    expect(entriesChain.range).toHaveBeenCalledWith(1, 10);  // offset, offset+limit-1
  });

  it('caps limit at 100', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: [], error: null, count: 0 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global', limit: '999' }));
    expect(entriesChain.range).toHaveBeenCalledWith(0, 99); // capped at 100
  });

  it('includes Cache-Control header', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: [], error: null, count: 0 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }));
    expect(res.headers.get('Cache-Control')).toContain('max-age=30');
  });

  it('uses client-side ladder config labels when available', async () => {
    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: VALID_LADDER_ROW, error: null } });
    const entriesChain = buildChain({ range: { data: [], error: null, count: 0 } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(entriesChain);

    const res  = await GET(makeRequest({ gameSlug: 'dancing-crab', ladderSlug: 'global' }));
    const body = await res.json();
    // 'dancing-crab:global' is in LADDER_CONFIGS so labels come from there
    expect(body.ladder.primaryLabel).toBe('Score');
    expect(body.ladder.secondaryLabel).toBe('Accuracy %');
  });
});
