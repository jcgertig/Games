import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/close/route';

function makeRequest(token?: string) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/close', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const PARAMS = { params: Promise.resolve({ code: 'TEST' }) };
const OWNER  = mockUser({ id: 'owner-id' });
const OTHER  = mockUser({ id: 'other-id' });

describe('POST /api/online/rooms/[code]/close', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 401 when no token', async () => {
    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 401 when auth.getUser returns null user', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 404 when room not found', async () => {
    // Default chain has maybeSingle → { data: null, error: null }
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not the owner', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OTHER }, error: null });
    const chain = buildChain({ single: { data: { id: 'room-id', owner_id: 'owner-id' }, error: null } });
    mockClient.from.mockReturnValue(chain as never);
    const res = await POST(makeRequest('token'), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/owner/i);
  });

  it('deletes the room and returns 200 when called by owner', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: OWNER }, error: null });
    // Both from('online_rooms') calls share the same chain
    const chain = buildChain({ single: { data: { id: 'room-id', owner_id: 'owner-id' }, error: null } });
    mockClient.from.mockReturnValue(chain as never);

    const res = await POST(makeRequest('token'), PARAMS);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'room-id');
  });
});
