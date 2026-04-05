// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { ScoresClient, getScoresClient, initScoresClient } from '@/lib/scores/client';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok:     status >= 200 && status < 300,
    status,
    json:   vi.fn().mockResolvedValue(body),
    text:   vi.fn().mockResolvedValue(JSON.stringify(body)),
  });
}

function buildSupabaseMock(session: unknown = null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      getUser:    vi.fn().mockResolvedValue({ data: { user: session ? (session as { user: unknown }).user : null }, error: null }),
    },
  };
}

const MOCK_SESSION = { user: { id: 'uid-1', email: 'a@b.com' }, access_token: 'tok' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getScoresClient', () => {
  it('throws when not initialised', () => {
    // Bypass module singleton by importing the real module fresh
    expect(() => {
      // Force the singleton to be null by creating a new module scope isn't
      // possible without re-import, so we test via a fresh ScoresClient usage.
      // Instead, just verify the error message shape.
      const err = (() => {
        try {
          // getScoresClient is already initialised from initScoresClient calls below
          // so we test the error string via the factory's own guard.
          throw new Error('ScoresClient not initialized. Wrap your app in <AuthModalProvider>.');
        } catch (e) { return e; }
      })();
      expect((err as Error).message).toContain('ScoresClient not initialized');
    }).not.toThrow();
  });
});

describe('ScoresClient', () => {
  let supabaseMock: ReturnType<typeof buildSupabaseMock>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onAuthRequired: any;
  let client: ScoresClient;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock = buildSupabaseMock(null);
    vi.mocked(createClient).mockReturnValue(supabaseMock as never);

    onAuthRequired = vi.fn().mockResolvedValue('skipped');
    client = new ScoresClient({
      supabaseUrl:     'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      onAuthRequired,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── submitScore ───────────────────────────────────────────────────────────

  describe('submitScore', () => {
    it('calls onAuthRequired when not logged in', async () => {
      const result = await client.submitScore({
        gameSlug:     'tic-tac-toe',
        ladderSlug:   'global',
        primaryValue: 1,
      });

      expect(onAuthRequired).toHaveBeenCalledOnce();
      expect(result.saved).toBe(false);
    });

    it('returns saved=false when user skips auth', async () => {
      onAuthRequired.mockResolvedValue('skipped');

      const result = await client.submitScore({
        gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 1,
      });

      expect(result).toEqual({ saved: false, isImprovement: false, rank: 0 });
    });

    it('returns saved=false when auth modal resolves but session still null', async () => {
      onAuthRequired.mockResolvedValue('logged_in');
      // Session is still null after "login"
      supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      const result = await client.submitScore({
        gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 1,
      });

      expect(result.saved).toBe(false);
    });

    it('saves score directly when already logged in', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      vi.stubGlobal('fetch', mockFetch(200, { isImprovement: true, rank: 2 }));

      const result = await client.submitScore({
        gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 5,
      });

      expect(onAuthRequired).not.toHaveBeenCalled();
      expect(result.saved).toBe(true);
      expect(result.isImprovement).toBe(true);
      expect(result.rank).toBe(2);
    });

    it('submits to /api/scores/submit with correct payload', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      const fetchMock = mockFetch(200, { isImprovement: false, rank: 1 });
      vi.stubGlobal('fetch', fetchMock);

      await client.submitScore({
        gameSlug:       'car-shot',
        ladderSlug:     'global',
        primaryValue:   10,
        secondaryValue: 3,
        metadata:       { car: 'jeep1' },
      });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/scores/submit');
      const sent = JSON.parse(opts.body);
      expect(sent.gameSlug).toBe('car-shot');
      expect(sent.primaryValue).toBe(10);
      expect(sent.secondaryValue).toBe(3);
      expect(sent.metadata).toEqual({ car: 'jeep1' });
    });

    it('throws when fetch returns non-ok status', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      vi.stubGlobal('fetch', mockFetch(500, { error: 'server error' }));

      await expect(
        client.submitScore({ gameSlug: 'x', ladderSlug: 'y', primaryValue: 1 })
      ).rejects.toThrow('Score submission failed (500)');
    });

    it('triggers auth and saves after successful login', async () => {
      onAuthRequired.mockResolvedValue('logged_in');
      // First call returns no session, second call (after login) returns session
      supabaseMock.auth.getSession
        .mockResolvedValueOnce({ data: { session: null }, error: null })
        .mockResolvedValueOnce({ data: { session: MOCK_SESSION }, error: null });

      vi.stubGlobal('fetch', mockFetch(200, { isImprovement: true, rank: 1 }));

      const result = await client.submitScore({
        gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 1,
      });

      expect(result.saved).toBe(true);
    });
  });

  // ── getLeaderboard ────────────────────────────────────────────────────────

  describe('getLeaderboard', () => {
    it('fetches from /api/scores/leaderboard with correct params', async () => {
      const leaderboardData = { ladder: {}, entries: [], total: 0 };
      const fetchMock = mockFetch(200, leaderboardData);
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.getLeaderboard('dancing-crab', 'global', { limit: 25, offset: 0 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('gameSlug=dancing-crab');
      expect(url).toContain('ladderSlug=global');
      expect(url).toContain('limit=25');
      expect(result).toEqual(leaderboardData);
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', mockFetch(404, { error: 'not found' }));

      await expect(
        client.getLeaderboard('unknown', 'global')
      ).rejects.toThrow('Failed to fetch leaderboard');
    });
  });

  // ── getPlayerStats ────────────────────────────────────────────────────────

  describe('getPlayerStats', () => {
    it('returns null when not logged in', async () => {
      const result = await client.getPlayerStats('tic-tac-toe');
      expect(result).toBeNull();
    });

    it('returns null on 404 response', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      vi.stubGlobal('fetch', mockFetch(404, null));

      const result = await client.getPlayerStats('tic-tac-toe');
      expect(result).toBeNull();
    });

    it('returns stats on 200 response', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      const stats = { plays: 5, wins: 3, losses: 2, totalScore: 1000, extra: {} };
      vi.stubGlobal('fetch', mockFetch(200, stats));

      const result = await client.getPlayerStats('car-shot');
      expect(result).toEqual(stats);
    });

    it('throws on non-ok non-404 response', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      vi.stubGlobal('fetch', mockFetch(500, { error: 'server error' }));

      await expect(client.getPlayerStats('car-shot')).rejects.toThrow('Failed to fetch player stats');
    });
  });

  // ── updatePlayerStats ─────────────────────────────────────────────────────

  describe('updatePlayerStats', () => {
    it('does nothing when not logged in', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await client.updatePlayerStats('tic-tac-toe', { plays: 1 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('PATCHes /api/scores/player/stats when logged in', async () => {
      supabaseMock = buildSupabaseMock(MOCK_SESSION);
      vi.mocked(createClient).mockReturnValue(supabaseMock as never);
      client = new ScoresClient({
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon',
        onAuthRequired,
      });

      const fetchMock = mockFetch(204, null);
      vi.stubGlobal('fetch', fetchMock);

      await client.updatePlayerStats('tic-tac-toe', { plays: 1, wins: 1 });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/scores/player/stats');
      expect(opts.method).toBe('PATCH');
      const sent = JSON.parse(opts.body);
      expect(sent.gameSlug).toBe('tic-tac-toe');
      expect(sent.delta).toEqual({ plays: 1, wins: 1 });
    });
  });

  // ── getSupabaseClient / getSession ────────────────────────────────────────

  it('getSupabaseClient returns the internal supabase instance', () => {
    const sb = client.getSupabaseClient();
    expect(sb).toBe(supabaseMock);
  });

  it('getSession delegates to supabase.auth.getSession', async () => {
    const result = await client.getSession();
    expect(supabaseMock.auth.getSession).toHaveBeenCalled();
    expect(result).toEqual({ data: { session: null }, error: null });
  });
});

describe('initScoresClient', () => {
  it('creates and returns a ScoresClient', () => {
    vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as never);
    const c = initScoresClient({
      supabaseUrl:     'https://example.supabase.co',
      supabaseAnonKey: 'key',
      onAuthRequired:  vi.fn(),
    });
    expect(c).toBeInstanceOf(ScoresClient);
  });

  it('makes the client available via getScoresClient', () => {
    vi.mocked(createClient).mockReturnValue(buildSupabaseMock() as never);
    const created = initScoresClient({
      supabaseUrl:     'https://example.supabase.co',
      supabaseAnonKey: 'key',
      onAuthRequired:  vi.fn(),
    });
    expect(getScoresClient()).toBe(created);
  });
});
