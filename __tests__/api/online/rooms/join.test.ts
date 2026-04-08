import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/app/api/online/_registry', () => ({
  getGameConfig: vi.fn().mockReturnValue({
    patchPlayerName: (state: any, seat: number, name: string) => ({
      ...state, playerNames: state.playerNames.map((n: string, i: number) => i === seat ? name : n),
    }),
    restoreHuman: (state: any, seat: number, name: string) => ({
      ...state, playerNames: state.playerNames.map((n: string, i: number) => i === seat ? name : n),
    }),
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/join/route';

function makeRequest(token?: string) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/join', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const PARAMS  = { params: Promise.resolve({ code: 'TEST' }) };
const PLAYER  = mockUser({ id: 'player-id', user_metadata: { display_name: 'Alice' } });
const WAITING_ROOM   = { id: 'room-id', game_slug: 'hearts', status: 'waiting',  spectators: [] };
const PLAYING_ROOM   = { id: 'room-id', game_slug: 'hearts', status: 'playing',  spectators: [] };
const DONE_ROOM      = { id: 'room-id', game_slug: 'hearts', status: 'done',     spectators: [] };
const FULL_BOT_SEATS = [
  { seat: 0, is_bot: false },
  { seat: 1, is_bot: false },
  { seat: 2, is_bot: false },
  { seat: 3, is_bot: false },
];
const WITH_BOT_SEAT  = [
  { seat: 0, is_bot: false },
  { seat: 1, is_bot: true  },
  { seat: 2, is_bot: false },
  { seat: 3, is_bot: false },
];

describe('POST /api/online/rooms/[code]/join', () => {
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
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 409 when room is done', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const chain = buildChain({ single: { data: DONE_ROOM, error: null } });
    mockClient.from.mockReturnValue(chain as never);
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(409);
  });

  it('returns existing seat when player is already seated (rejoin)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: WAITING_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 2 }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.yourSeat).toBe(2);
    expect(body.spectator).toBe(false);
  });

  it('returns existing spectator status on re-join when already a spectator', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const roomWithSpectator = { ...PLAYING_ROOM, spectators: [{ user_id: 'player-id', display_name: 'Alice' }] };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: roomWithSpectator, error: null } });
      if (table === 'online_seats')
        // No existing seat for this user
        return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ yourSeat: null, spectator: true });
  });

  it('claims a bot seat in a waiting room', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const seatsChain = buildChain({ await: { data: WITH_BOT_SEAT, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: WAITING_ROOM, error: null } });
      if (table === 'online_seats') return seatsChain;
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.yourSeat).toBe(1);
    expect(body.spectator).toBe(false);
    expect(seatsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'player-id', is_bot: false }),
    );
  });

  it('becomes spectator when joining a playing game with no open bot seats', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const roomsChain = buildChain({ single: { data: PLAYING_ROOM, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      if (table === 'online_seats')
        // All seats are human — no bots
        return buildChain({ await: { data: FULL_BOT_SEATS, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.yourSeat).toBeNull();
    expect(body.spectator).toBe(true);
    // Should add to spectators list
    expect(roomsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ spectators: [{ user_id: 'player-id', display_name: 'Alice' }] }),
    );
  });

  it('claims a bot seat in a playing game (mid-game rejoin)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    const gameState = { phase: 'playing', playerNames: ['P0', 'P1', 'P2', 'P3'] };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: PLAYING_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ await: { data: WITH_BOT_SEAT, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: gameState }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.yourSeat).toBe(1);
    expect(body.spectator).toBe(false);
  });

  it('returns 409 when waiting room is full', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: PLAYER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: WAITING_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ await: { data: FULL_BOT_SEATS, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/full/i);
  });
});
