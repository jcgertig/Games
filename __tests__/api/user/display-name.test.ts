import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../helpers/supabase-mock';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
const mockIsProfane = vi.hoisted(() => vi.fn().mockReturnValue(false));
vi.mock('bad-words', () => ({
  Filter: class {
    isProfane = mockIsProfane;
  },
}));
vi.mock('@/lib/display-name', () => ({
  validateDisplayNameFormat: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import { validateDisplayNameFormat } from '@/lib/display-name';
import { PATCH } from '@/app/api/user/display-name/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, authHeader?: string) {
  return new NextRequest('http://localhost/api/user/display-name', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

function makeRequestBadJson(authHeader?: string) {
  return new NextRequest('http://localhost/api/user/display-name', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: 'not json{{{',
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/user/display-name', () => {
  let mockClient: ReturnType<typeof createMockClient> & {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
      admin: { updateUserById: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      ...createMockClient(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn(),
        admin: {
          getUserById: vi.fn(),
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    };

    vi.mocked(createClient).mockReturnValue(mockClient as never);
    vi.mocked(validateDisplayNameFormat).mockReturnValue({ ok: true, name: 'TestUser' });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when no authorization header is provided', async () => {
    const res = await PATCH(makeRequest({ displayName: 'TestUser' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when token is invalid and getUser returns no user', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid token'),
    });

    const res = await PATCH(makeRequest({ displayName: 'TestUser' }, 'Bearer bad-token'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  // ── Request body ──────────────────────────────────────────────────────────

  it('returns 400 when body is not valid JSON', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const res = await PATCH(makeRequestBadJson('Bearer valid-token'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  // ── Display name validation ───────────────────────────────────────────────

  it('returns 422 when validateDisplayNameFormat returns an error', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    vi.mocked(validateDisplayNameFormat).mockReturnValue({
      ok: false,
      error: 'Name too short',
    });

    const res = await PATCH(makeRequest({ displayName: 'X' }, 'Bearer valid-token'));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('Name too short');
  });

  it('returns 422 when display name contains profanity', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    vi.mocked(validateDisplayNameFormat).mockReturnValue({ ok: true, name: 'BadWord' });
    mockIsProfane.mockReturnValueOnce(true);

    const res = await PATCH(makeRequest({ displayName: 'BadWord' }, 'Bearer valid-token'));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/inappropriate/i);
  });

  // ── Supabase update ───────────────────────────────────────────────────────

  it('returns 500 when updateUserById fails', async () => {
    const user = mockUser({ user_metadata: { role: 'player' } });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockClient.auth.admin.updateUserById.mockResolvedValue({
      data: null,
      error: new Error('DB error'),
    });

    const res = await PATCH(makeRequest({ displayName: 'TestUser' }, 'Bearer valid-token'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to update/i);
  });

  // ── Leaderboard sync ──────────────────────────────────────────────────────

  it('syncs leaderboard entries and returns 200 on success', async () => {
    const user = mockUser({ user_metadata: { role: 'player' } });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const leaderboardChain = buildChain();
    mockClient.from = vi.fn((table: string) => {
      if (table === 'leaderboard_entries') return leaderboardChain;
      return buildChain();
    });

    const res = await PATCH(makeRequest({ displayName: 'TestUser' }, 'Bearer valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe('TestUser');

    // leaderboard sync was attempted
    expect(mockClient.from).toHaveBeenCalledWith('leaderboard_entries');
    expect(leaderboardChain.update).toHaveBeenCalledWith({ display_name: 'TestUser' });
    expect(leaderboardChain.eq).toHaveBeenCalledWith('user_id', user.id);
  });

  it('still returns 200 when leaderboard sync errors (non-fatal)', async () => {
    const user = mockUser();
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const leaderboardChain = buildChain();
    // eq is the last call in the chain — make it resolve with an error
    leaderboardChain.eq.mockResolvedValue({ error: new Error('sync fail') });
    mockClient.from = vi.fn(() => leaderboardChain);

    const res = await PATCH(makeRequest({ displayName: 'TestUser' }, 'Bearer valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.displayName).toBe('TestUser');
  });

  // ── User metadata merging ─────────────────────────────────────────────────

  it('merges new display_name into existing user_metadata', async () => {
    const user = mockUser({ user_metadata: { avatar: 'cat', theme: 'dark' } });
    mockClient.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    await PATCH(makeRequest({ displayName: 'TestUser' }, 'Bearer valid-token'));

    expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          avatar: 'cat',
          theme: 'dark',
          display_name: 'TestUser',
        }),
      }),
    );
  });
});
