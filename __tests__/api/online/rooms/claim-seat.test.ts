import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/app/api/online/_registry', () => ({
  getGameConfig: vi.fn().mockReturnValue({
    restoreHuman: (state: any, seat: number, name: string) => ({
      ...state, playerNames: state.playerNames.map((n: string, i: number) => i === seat ? name : n),
    }),
    patchPlayerName: (state: any, seat: number, name: string) => ({
      ...state, playerNames: state.playerNames.map((n: string, i: number) => i === seat ? name : n),
    }),
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/claim-seat/route';

function makeRequest(token?: string) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/claim-seat', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const PARAMS    = { params: Promise.resolve({ code: 'TEST' }) };
const SPECTATOR = mockUser({ id: 'spectator-id' });
const BASE_ROOM = {
  id: 'room-id', game_slug: 'hearts', status: 'playing',
  spectators: [{ user_id: 'spectator-id', display_name: 'Alice' }],
};

describe('POST /api/online/rooms/[code]/claim-seat', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 401 when no token', async () => {
    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 404 when room not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: SPECTATOR }, error: null });
    // default chain: maybeSingle → { data: null }
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not a spectator', async () => {
    const nonSpectator = mockUser({ id: 'stranger-id' });
    mockClient.auth.getUser.mockResolvedValue({ data: { user: nonSpectator }, error: null });
    const chain = buildChain({ single: { data: BASE_ROOM, error: null } });
    mockClient.from.mockReturnValue(chain as never);
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns seat_taken when no bot seats are available', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: SPECTATOR }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        // Bot seats query resolves to empty array when awaited directly
        return buildChain({ await: { data: [], error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(await res.json()).toMatchObject({ error: 'seat_taken' });
  });

  it('returns yourSeat and removes spectator when claim succeeds', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: SPECTATOR }, error: null });

    const gameState = { phase: 'playing', playerNames: ['P0', 'P1', 'P2', 'P3'], isBot: [false, false, true, false] };
    const roomsChain = buildChain({ single: { data: BASE_ROOM, error: null } });

    // Track how many times online_seats is queried
    let seatsCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      if (table === 'online_seats') {
        seatsCallCount++;
        if (seatsCallCount === 1)
          // First call: list of bot seats
          return buildChain({ await: { data: [{ seat: 2 }], error: null } });
        // Second (update) and third (verify) calls: verify claim success
        return buildChain({ single: { data: { seat: 2, is_bot: false, user_id: 'spectator-id' }, error: null } });
      }
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: gameState }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.yourSeat).toBe(2);
    // Spectator should be removed from the room's spectators list
    expect(roomsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ spectators: [] }),
    );
  });
});
