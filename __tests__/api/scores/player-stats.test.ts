import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser, mockSession } from '../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { GET, PATCH } from '@/app/api/scores/player/stats/route';

function makeGet(gameSlug?: string, authHeader?: string) {
  const url = new URL('http://localhost/api/scores/player/stats');
  if (gameSlug) url.searchParams.set('gameSlug', gameSlug);
  return new NextRequest(url, {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function makePatch(body: unknown, authHeader?: string) {
  return new NextRequest('http://localhost/api/scores/player/stats', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

const STATS_ROW = {
  plays:          10,
  wins:           7,
  losses:         3,
  total_score:    5000,
  best_score:     800,
  best_time:      null,
  extra:          { highestLevel: 5 },
  last_played_at: '2026-01-01T00:00:00Z',
};

describe('GET /api/scores/player/stats', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 400 when gameSlug is missing', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('gameSlug');
  });

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const res = await GET(makeGet('tic-tac-toe'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when game not found', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: null, error: null } });
    mockClient.from.mockReturnValue(gamesChain);

    const res = await GET(makeGet('unknown-game', 'Bearer token'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when player has no stats yet', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const statsChain = buildChain({ single: { data: null, error: null } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(statsChain);

    const res = await GET(makeGet('tic-tac-toe', 'Bearer token'));
    expect(res.status).toBe(404);
  });

  it('returns 200 with mapped stats on success', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const statsChain = buildChain({ single: { data: STATS_ROW, error: null } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(statsChain);

    const res  = await GET(makeGet('car-shot', 'Bearer token'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.plays).toBe(10);
    expect(body.wins).toBe(7);
    expect(body.losses).toBe(3);
    expect(body.totalScore).toBe(5000);
    expect(body.bestScore).toBe(800);
    expect(body.extra).toEqual({ highestLevel: 5 });
    expect(body.lastPlayedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('returns 401 when bearer token is empty (no cookie fallback)', async () => {
    // The service-role client has no access to browser cookies, so an empty
    // Authorization header must be rejected immediately without a session fallback.
    const res = await GET(makeGet('car-shot'));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/scores/player/stats', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 401 when not authenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const res = await PATCH(makePatch({ gameSlug: 'tic-tac-toe', delta: { plays: 1 } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const req = new NextRequest('http://localhost/api/scores/player/stats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer token' },
      body: '{bad json',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when gameSlug is missing', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const res = await PATCH(makePatch({ delta: { plays: 1 } }, 'Bearer token'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when delta is missing', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const res = await PATCH(makePatch({ gameSlug: 'tic-tac-toe' }, 'Bearer token'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when game not found', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const chain = buildChain({ single: { data: null, error: null } });
    mockClient.from.mockReturnValue(chain);

    const res = await PATCH(makePatch({ gameSlug: 'unknown', delta: { plays: 1 } }, 'Bearer token'));
    expect(res.status).toBe(404);
  });

  it('returns 500 when RPC fails', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: { id: 'gid' }, error: null } });
    mockClient.from.mockReturnValue(gamesChain);
    mockClient.rpc.mockResolvedValue({ data: null, error: new Error('rpc error') });

    const res = await PATCH(makePatch({ gameSlug: 'tic-tac-toe', delta: { plays: 1 } }, 'Bearer token'));
    expect(res.status).toBe(500);
  });

  it('returns 204 on success', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: { id: 'gid' }, error: null } });
    mockClient.from.mockReturnValue(gamesChain);
    mockClient.rpc.mockResolvedValue({ data: null, error: null });

    const res = await PATCH(makePatch({ gameSlug: 'tic-tac-toe', delta: { plays: 1, wins: 1 } }, 'Bearer token'));
    expect(res.status).toBe(204);
  });

  it('calls increment_player_stats RPC with correct params', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: { id: 'game-uuid' }, error: null } });
    mockClient.from.mockReturnValue(gamesChain);
    mockClient.rpc.mockResolvedValue({ data: null, error: null });

    const delta = { plays: 1, wins: 1, totalScore: 200 };
    await PATCH(makePatch({ gameSlug: 'tic-tac-toe', delta }, 'Bearer token'));

    expect(mockClient.rpc).toHaveBeenCalledWith('increment_player_stats', {
      p_game_id: 'game-uuid',
      p_user_id: 'user-id-123',
      p_delta:   delta,
    });
  });
});
