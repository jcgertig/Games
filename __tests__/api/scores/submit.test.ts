import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../helpers/supabase-mock';

// ── Mock @supabase/supabase-js ────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/scores/submit/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, authHeader?: string) {
  return new NextRequest('http://localhost/api/scores/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  gameSlug:     'tic-tac-toe',
  ladderSlug:   'global',
  primaryValue: 100,
  secondaryValue: 5,
  metadata:     { level: 3 },
  clientTs:     '2026-01-01T00:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/scores/submit', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no auth token and no session', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('jwt invalid') });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when auth.getUser has error and session has no user', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const res = await POST(makeRequest(VALID_BODY, 'Bearer bad-token'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when user resolves to null with no session fallback', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const res = await POST(makeRequest(VALID_BODY, 'Bearer some-token'));
    expect(res.status).toBe(401);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/scores/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer token' },
      body: 'not-json{{{',
    });

    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: { user } }, error: null });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when gameSlug is missing', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const res = await POST(makeRequest({ ladderSlug: 'global', primaryValue: 1 }, 'Bearer token'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  it('returns 400 when primaryValue is missing', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const res = await POST(makeRequest({ gameSlug: 'tic-tac-toe', ladderSlug: 'global' }, 'Bearer token'));
    expect(res.status).toBe(400);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns 404 when game is not found', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain = buildChain({ single: { data: null, error: null } });
    mockClient.from.mockReturnValue(gamesChain);

    const res = await POST(makeRequest(VALID_BODY, 'Bearer token'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Game not found');
  });

  it('returns 404 when ladder is not found', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const gamesChain  = buildChain({ single: { data: { id: 'game-id' }, error: null } });
    const laddersChain = buildChain({ single: { data: null, error: null } });

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain);

    const res = await POST(makeRequest(VALID_BODY, 'Bearer token'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Ladder not found');
  });

  // ── Server errors ─────────────────────────────────────────────────────────

  it('returns 500 when RPC fails', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.admin.getUserById.mockResolvedValue({ data: { user }, error: null });

    const gamesChain   = buildChain({ single: { data: { id: 'game-id' }, error: null } });
    const laddersChain = buildChain({ single: { data: { id: 'ladder-id' }, error: null } });
    const subChain     = buildChain();

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(subChain);

    mockClient.rpc.mockResolvedValue({ data: null, error: new Error('rpc failed') });

    const res = await POST(makeRequest(VALID_BODY, 'Bearer token'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save score');
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('returns 200 with isImprovement and rank on success', async () => {
    const user = mockUser({ user_metadata: { display_name: 'TestPlayer' } });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.admin.getUserById.mockResolvedValue({ data: { user }, error: null });

    const gamesChain   = buildChain({ single: { data: { id: 'game-id' }, error: null } });
    const laddersChain = buildChain({ single: { data: { id: 'ladder-id' }, error: null } });
    const subChain     = buildChain();

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(subChain);

    mockClient.rpc.mockResolvedValue({
      data: { is_improvement: true, rank: 3 },
      error: null,
    });

    const res = await POST(makeRequest(VALID_BODY, 'Bearer token'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.isImprovement).toBe(true);
    expect(body.rank).toBe(3);
  });

  it('uses email prefix as display name when no display_name in metadata', async () => {
    const user = mockUser({ email: 'player@test.com', user_metadata: {} });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.admin.getUserById.mockResolvedValue({ data: { user }, error: null });

    const gamesChain   = buildChain({ single: { data: { id: 'game-id' }, error: null } });
    const laddersChain = buildChain({ single: { data: { id: 'ladder-id' }, error: null } });
    const subChain     = buildChain();

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(subChain);

    mockClient.rpc.mockResolvedValue({ data: { is_improvement: false, rank: 1 }, error: null });

    const res = await POST(makeRequest(VALID_BODY, 'Bearer token'));
    expect(res.status).toBe(200);

    // Verify the RPC was called with 'player' as the display name
    expect(mockClient.rpc).toHaveBeenCalledWith(
      'upsert_leaderboard_entry',
      expect.objectContaining({ p_display_name: 'player' })
    );
  });

  it('falls back to "Player" when user has no email', async () => {
    const user = mockUser({ email: undefined, user_metadata: {} });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { ...user, email: undefined } },
      error: null,
    });

    const gamesChain   = buildChain({ single: { data: { id: 'game-id' }, error: null } });
    const laddersChain = buildChain({ single: { data: { id: 'ladder-id' }, error: null } });
    const subChain     = buildChain();

    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(subChain);

    mockClient.rpc.mockResolvedValue({ data: { is_improvement: false, rank: 1 }, error: null });

    const res = await POST(makeRequest(VALID_BODY, 'Bearer token'));
    expect(res.status).toBe(200);
    expect(mockClient.rpc).toHaveBeenCalledWith(
      'upsert_leaderboard_entry',
      expect.objectContaining({ p_display_name: 'Player' })
    );
  });

  it('passes secondaryValue and metadata to RPC', async () => {
    const user = mockUser({ user_metadata: { display_name: 'Player1' } });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.admin.getUserById.mockResolvedValue({ data: { user }, error: null });

    const gamesChain   = buildChain({ single: { data: { id: 'gid' }, error: null } });
    const laddersChain = buildChain({ single: { data: { id: 'lid' }, error: null } });
    const subChain     = buildChain();
    mockClient.from
      .mockReturnValueOnce(gamesChain)
      .mockReturnValueOnce(laddersChain)
      .mockReturnValueOnce(subChain);
    mockClient.rpc.mockResolvedValue({ data: { is_improvement: true, rank: 1 }, error: null });

    await POST(makeRequest(VALID_BODY, 'Bearer token'));

    expect(mockClient.rpc).toHaveBeenCalledWith(
      'upsert_leaderboard_entry',
      expect.objectContaining({
        p_primary_value:   100,
        p_secondary_value: 5,
        p_metadata:        { level: 3 },
      })
    );
  });
});
