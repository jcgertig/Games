import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

const { mockStartGame } = vi.hoisted(() => ({
  mockStartGame: vi.fn(),
}));

vi.mock('@/app/api/online/_registry', () => ({
  getGameConfig: vi.fn().mockReturnValue({
    startGame: mockStartGame,
  }),
}));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/start/route';

const PARAMS = { params: Promise.resolve({ code: 'TEST' }) };
const OWNER  = mockUser({ id: 'owner-id' });
const OTHER  = mockUser({ id: 'other-id' });

function makeRequest(token?: string) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/start', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe('POST /api/online/rooms/[code]/start', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
    mockStartGame.mockReturnValue({ phase: 'passing' });
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
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    // default chain → maybeSingle resolves null
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not the owner', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OTHER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { id: 'r', game_slug: 'hearts', status: 'waiting', owner_id: 'owner-id' }, error: null } }) as never
    );
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 409 when room status is done', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { id: 'r', game_slug: 'hearts', status: 'done', owner_id: 'owner-id' }, error: null } }) as never
    );
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(409);
  });

  it('returns 500 when game state not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: { id: 'r', game_slug: 'hearts', status: 'waiting', owner_id: 'owner-id' }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(500);
  });

  it('returns 409 when game state phase is not waiting', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: { id: 'r', game_slug: 'hearts', status: 'waiting', owner_id: 'owner-id' }, error: null } });
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: { phase: 'passing' } }, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(409);
  });

  it('returns 200 and flips room to playing from waiting', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    const roomsChain = buildChain({ single: { data: { id: 'r', game_slug: 'hearts', status: 'waiting', owner_id: 'owner-id' }, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: { phase: 'waiting' } }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    // Room status should have been updated
    expect(roomsChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'playing' }));
  });

  it('returns 200 but does NOT update room status when already playing', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    const roomsChain = buildChain({ single: { data: { id: 'r', game_slug: 'hearts', status: 'playing', owner_id: 'owner-id' }, error: null } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms') return roomsChain;
      if (table === 'online_game_state')
        return buildChain({ single: { data: { state: { phase: 'waiting' } }, error: null } });
      return buildChain();
    });

    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(200);
    // Should NOT have called update on rooms (state update goes to game_state)
    expect(roomsChain.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'playing' })
    );
  });
});
