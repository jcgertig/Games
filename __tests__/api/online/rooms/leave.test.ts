import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/app/api/online/_registry', () => ({
  getGameConfig: vi.fn().mockReturnValue({
    defaultBotNames: ['West Bot', 'North Bot', 'East Bot'],
    replaceWithBot: (state: any, seat: number, name: string) => ({
      ...state, playerNames: state.playerNames.map((n: string, i: number) => i === seat ? name : n),
    }),
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/leave/route';

function makeRequest(token?: string, body?: object) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/leave', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

const PARAMS = { params: Promise.resolve({ code: 'TEST' }) };
const OWNER  = mockUser({ id: 'owner-id' });
const PLAYER = mockUser({ id: 'player-id' });

const BASE_ROOM = { id: 'room-id', game_slug: 'hearts', status: 'playing', owner_id: 'owner-id', spectators: [] };

describe('POST /api/online/rooms/[code]/leave', () => {
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
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    // default chain maybeSingle → null
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is the owner', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    const chain = buildChain({ single: { data: BASE_ROOM, error: null } });
    mockClient.from.mockReturnValue(chain as never);
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates seat to bot (waiting room, no game state)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const waitingRoom = { ...BASE_ROOM, status: 'waiting' };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: waitingRoom, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 2 }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isSpectator).toBe(false);
  });

  it('returns 200, updates seat to bot and patches game state (playing room)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const gameState = {
      phase: 'playing',
      playerNames: ['P0', 'P1', 'P2', 'P3'],
      isBot: [false, false, false, false],
      curSeat: 0,
    };

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 1 }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: gameState }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('becomes spectator when spectate=true', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { ...PLAYER, user_metadata: { display_name: 'Alice' } } },
      error: null,
    });
    const roomsChain = buildChain({ single: { data: BASE_ROOM, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 2 }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token', { spectate: true }), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isSpectator).toBe(true);
    // Should have updated spectators on the room
    expect(roomsChain.update).toHaveBeenCalled();
  });

  it('removes spectator from list when spectate=false', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const roomWithSpectator = { ...BASE_ROOM, spectators: [{ user_id: 'player-id', display_name: 'Alice' }] };
    const roomsChain = buildChain({ single: { data: roomWithSpectator, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      // No seat row — user is a spectator only
      if (table === 'online_seats') return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token', { spectate: false }), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json()).isSpectator).toBe(false);
    expect(roomsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ spectators: [] }),
    );
  });

  it('returns 200 with no-op when user is not seated and not a spectator', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    // User is not in spectators and has no seat
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json())).toMatchObject({ ok: true, isSpectator: false });
  });
});
