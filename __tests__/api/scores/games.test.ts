import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildChain, createMockClient } from '../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { GET } from '@/app/api/scores/games/route';

const GAMES_WITH_LADDERS = [
  {
    slug: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    ladders: [{ slug: 'global', name: 'Global Wins', score_type: 'total_wins' }],
  },
  {
    slug: 'car-shot',
    name: 'Car Shot',
    ladders: [{ slug: 'global', name: 'Global', score_type: 'composite' }],
  },
];

describe('GET /api/scores/games', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 500 when DB query fails', async () => {
    const chain = buildChain();
    // Override the chain to resolve the order() terminal with an error.
    // The games route does: .from('games').select(...).eq(...).eq(...).order('created_at')
    // We mock order() to return an object that resolves with an error.
    chain.order.mockResolvedValue({ data: null, error: new Error('db error') });
    mockClient.from.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to fetch games');
  });

  it('returns 200 with empty games array when no games exist', async () => {
    const chain = buildChain();
    chain.order.mockResolvedValue({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    const res  = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toEqual([]);
  });

  it('returns 200 with games and their ladders', async () => {
    const chain = buildChain();
    chain.order.mockResolvedValue({ data: GAMES_WITH_LADDERS, error: null });
    mockClient.from.mockReturnValue(chain);

    const res  = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.games).toHaveLength(2);
    expect(body.games[0].slug).toBe('tic-tac-toe');
    expect(body.games[0].ladders[0].slug).toBe('global');
  });

  it('returns Cache-Control header for long-lived caching', async () => {
    const chain = buildChain();
    chain.order.mockResolvedValue({ data: GAMES_WITH_LADDERS, error: null });
    mockClient.from.mockReturnValue(chain);

    const res = await GET();
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600');
  });

  it('queries with is_active=true filter', async () => {
    const chain = buildChain();
    chain.order.mockResolvedValue({ data: [], error: null });
    mockClient.from.mockReturnValue(chain);

    await GET();

    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
  });
});
