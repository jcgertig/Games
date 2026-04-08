import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

const { mockApplyAction, mockIsGameOver } = vi.hoisted(() => ({
  mockApplyAction: vi.fn(),
  mockIsGameOver:  vi.fn().mockReturnValue(false),
}));

vi.mock('@/app/api/online/_registry', () => ({
  getGameConfig: vi.fn().mockReturnValue({
    applyAction:  mockApplyAction,
    isGameOver:   mockIsGameOver,
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/action/route';

const PARAMS = { params: Promise.resolve({ code: 'TEST' }) };
const USER   = mockUser({ id: 'user-id' });
const BASE_ROOM = { id: 'room-id', game_slug: 'hearts', status: 'playing' };

function makeRequest(token?: string, body?: object) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/online/rooms/[code]/action', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
    mockApplyAction.mockReturnValue({ phase: 'playing' });
    mockIsGameOver.mockReturnValue(false);
  });

  it('returns 401 when no token', async () => {
    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest('token', { type: 'play', payload: {} }), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const req = new NextRequest('http://localhost/api/online/rooms/TEST/action', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/JSON/);
  });

  it('returns 400 when action type is missing', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makeRequest('token', { payload: {} }), PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 404 when room not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    // default chain → maybeSingle resolves null
    const res = await POST(makeRequest('token', { type: 'play', payload: {} }), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 409 when room is not playing', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { ...BASE_ROOM, status: 'waiting' }, error: null } }) as never
    );
    const res = await POST(makeRequest('token', { type: 'play', payload: {} }), PARAMS);
    expect(res.status).toBe(409);
  });

  it('returns 403 when user is not in the room', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token', { type: 'play', payload: {} }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 500 when game state not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token', { type: 'play', payload: {} }), PARAMS);
    expect(res.status).toBe(500);
  });

  it('returns 422 when applyAction throws', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockApplyAction.mockImplementationOnce(() => { throw new Error('Illegal move'); });
    const gameState = { phase: 'playing' };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: gameState }, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token', { type: 'play', payload: { card: 'AS' } }), PARAMS);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe('Illegal move');
  });

  it('returns 200 on successful action', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const gameState = { phase: 'playing' };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: gameState }, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token', { type: 'play', payload: { card: 'AS' } }), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('marks room done when isGameOver returns true', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockIsGameOver.mockReturnValue(true);
    const gameState = { phase: 'playing' };
    const roomsChain = buildChain({ single: { data: BASE_ROOM, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: gameState }, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token', { type: 'play', payload: { card: 'AS' } }), PARAMS);
    expect(res.status).toBe(200);
    // Room should have been updated to 'done'
    expect(roomsChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }));
  });
});
