import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/app/api/online/_registry', () => ({
  getGameConfig: vi.fn().mockReturnValue({
    gameSlug: 'hearts',
    maxSeats: 4,
    defaultBotNames: ['West Bot', 'North Bot', 'East Bot'],
    createWaitingState: (names: string[], isBot: boolean[]) => ({ phase: 'waiting', playerNames: names, isBot }),
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { getGameConfig } from '@/app/api/online/_registry';
import { POST } from '@/app/api/online/rooms/route';

function makeRequest(token?: string, body?: object) {
  return new NextRequest('http://localhost/api/online/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

const USER = mockUser({ id: 'user-id', email: 'alice@example.com' });

describe('POST /api/online/rooms', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 401 when no token', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest('token'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when gameSlug is missing', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makeRequest('token', {}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/gameSlug/);
  });

  it('returns 404 when game slug is unknown', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    vi.mocked(getGameConfig).mockImplementationOnce(() => {
      throw Object.assign(new Error('Unknown game: "unknown"'), { status: 404 });
    });
    const res = await POST(makeRequest('token', { gameSlug: 'unknown' }));
    expect(res.status).toBe(404);
  });

  it('returns 500 when code generation fails (all codes taken)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    // Always return data (collision) from the code check
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { id: 'existing' }, error: null } }) as never
    );
    const res = await POST(makeRequest('token', { gameSlug: 'hearts' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/unique room code/);
  });

  it('returns 500 when room insert fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') {
        const chain = buildChain({ single: { data: null, error: { message: 'DB error' } } });
        // First call (code check) resolves with null (no collision)
        // Second call (room insert → select → single) resolves with error
        // We need maybeSingle for code check and single for insert.
        // Let maybeSingle resolve to null (no collision), single to error.
        chain.maybeSingle.mockResolvedValue({ data: null, error: null });
        chain.single.mockResolvedValue({ data: null, error: { message: 'DB error' } });
        // Make insert return the same chain for chaining
        chain.insert.mockReturnValue(chain);
        return chain;
      }
      return buildChain();
    });
    const res = await POST(makeRequest('token', { gameSlug: 'hearts' }));
    expect(res.status).toBe(500);
  });

  it('returns 200 with code/roomId/yourSeat on success', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') {
        const chain = buildChain();
        chain.maybeSingle.mockResolvedValue({ data: null, error: null }); // no collision
        chain.single.mockResolvedValue({ data: { id: 'room-id' }, error: null });
        chain.insert.mockReturnValue(chain);
        return chain;
      }
      return buildChain();
    });

    const res = await POST(makeRequest('token', { gameSlug: 'hearts' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBeDefined();
    expect(body.roomId).toBe('room-id');
    expect(body.yourSeat).toBe(0);
  });

  it('uses display_name from user_metadata when available', async () => {
    const userWithName = { ...USER, user_metadata: { display_name: 'Alice' } };
    mockClient.auth.getUser.mockResolvedValue({ data: { user: userWithName }, error: null });
    const seatsChain = buildChain();
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') {
        const chain = buildChain();
        chain.maybeSingle.mockResolvedValue({ data: null, error: null });
        chain.single.mockResolvedValue({ data: { id: 'room-id' }, error: null });
        chain.insert.mockReturnValue(chain);
        return chain;
      }
      if (table === 'online_seats') return seatsChain;
      return buildChain();
    });

    await POST(makeRequest('token', { gameSlug: 'hearts' }));
    const insertCall = seatsChain.insert.mock.calls[0]?.[0];
    expect(insertCall?.[0]?.display_name).toBe('Alice');
  });
});
