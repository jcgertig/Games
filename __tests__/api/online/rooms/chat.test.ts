import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { buildChain, createMockClient, mockUser } from '../../../helpers/supabase-mock';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

const { mockIsProfane } = vi.hoisted(() => ({
  mockIsProfane: vi.fn().mockReturnValue(false),
}));

vi.mock('bad-words', () => ({
  Filter: vi.fn(function (this: any) { this.isProfane = mockIsProfane; }),
}));

import { createClient } from '@supabase/supabase-js';
import { POST } from '@/app/api/online/rooms/[code]/chat/route';
import { PATCH, DELETE } from '@/app/api/online/rooms/[code]/chat/[messageId]/route';

const PARAMS     = { params: Promise.resolve({ code: 'TEST' }) };
const MSG_PARAMS = { params: Promise.resolve({ code: 'TEST', messageId: 'msg-id' }) };
const USER = mockUser({ id: 'user-id', email: 'alice@example.com', user_metadata: { display_name: 'Alice' } });

function makeRequest(token?: string, body?: object) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

function makePatchRequest(token?: string, body?: object) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/chat/msg-id', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

function makeDeleteRequest(token?: string) {
  return new NextRequest('http://localhost/api/online/rooms/TEST/chat/msg-id', {
    method: 'DELETE',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const BASE_ROOM     = { id: 'room-id', spectators: [] };
const BASE_MESSAGE  = { id: 'msg-id', user_id: 'user-id', deleted_at: null };

describe('POST /api/online/rooms/[code]/chat', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
    mockIsProfane.mockReturnValue(false);
  });

  it('returns 401 when no token', async () => {
    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest('token', { body: 'hello' }), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is empty', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makeRequest('token', { body: '   ' }), PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 422 when body exceeds 500 chars', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await POST(makeRequest('token', { body: 'a'.repeat(501) }), PARAMS);
    expect(res.status).toBe(422);
  });

  it('returns 422 when body contains profanity', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockIsProfane.mockReturnValue(true);
    const res = await POST(makeRequest('token', { body: 'bad word' }), PARAMS);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('inappropriate');
  });

  it('returns 404 when room not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    // default chain → maybeSingle resolves null
    const res = await POST(makeRequest('token', { body: 'hello' }), PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not in room', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: null, error: null } });
      return buildChain();
    });
    const res = await POST(makeRequest('token', { body: 'hello' }), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_chat_messages') {
        const chain = buildChain();
        // .select('id', { count: 'exact', head: true }) + .eq + .is + .gte resolves with count=3
        (chain as any).then = (onFulfilled?: any) =>
          Promise.resolve({ data: null, error: null, count: 3 }).then(onFulfilled);
        return chain;
      }
      return buildChain();
    });
    const res = await POST(makeRequest('token', { body: 'hello' }), PARAMS);
    expect(res.status).toBe(429);
  });

  it('returns 201 with message on success (seated player)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const insertedMsg = { id: 'new-id', room_id: 'room-id', user_id: 'user-id', display_name: 'Alice', body: 'hello', created_at: new Date().toISOString(), edited_at: null, deleted_at: null };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_chat_messages') {
        const chain = buildChain({ single: { data: insertedMsg, error: null } });
        chain.insert.mockReturnValue(chain);
        (chain as any).then = (onFulfilled?: any) =>
          Promise.resolve({ data: null, error: null, count: 0 }).then(onFulfilled);
        return chain;
      }
      return buildChain();
    });
    const res = await POST(makeRequest('token', { body: 'hello' }), PARAMS);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message.body).toBe('hello');
  });

  it('returns 201 when user is a spectator (not seated)', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const roomWithSpectator = { id: 'room-id', spectators: [{ user_id: 'user-id', display_name: 'Alice' }] };
    const insertedMsg = { id: 'new-id', room_id: 'room-id', user_id: 'user-id', display_name: 'Alice', body: 'hi', created_at: new Date().toISOString(), edited_at: null, deleted_at: null };
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: roomWithSpectator, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: null, error: null } }); // not seated
      if (table === 'online_chat_messages') {
        const chain = buildChain({ single: { data: insertedMsg, error: null } });
        chain.insert.mockReturnValue(chain);
        (chain as any).then = (onFulfilled?: any) =>
          Promise.resolve({ data: null, error: null, count: 0 }).then(onFulfilled);
        return chain;
      }
      return buildChain();
    });
    const res = await POST(makeRequest('token', { body: 'hi' }), PARAMS);
    expect(res.status).toBe(201);
  });

  it('uses display_name from user_metadata', async () => {
    const userWithName = { ...USER, user_metadata: { display_name: 'Bob' } };
    mockClient.auth.getUser.mockResolvedValue({ data: { user: userWithName }, error: null });
    const chatChain = buildChain({ single: { data: { id: 'x', display_name: 'Bob', body: 'hey' }, error: null } });
    chatChain.insert.mockReturnValue(chatChain);
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_rooms')
        return buildChain({ single: { data: BASE_ROOM, error: null } });
      if (table === 'online_seats')
        return buildChain({ single: { data: { seat: 0 }, error: null } });
      if (table === 'online_chat_messages') {
        (chatChain as any).then = (onFulfilled?: any) =>
          Promise.resolve({ data: null, error: null, count: 0 }).then(onFulfilled);
        return chatChain;
      }
      return buildChain();
    });
    await POST(makeRequest('token', { body: 'hey' }), PARAMS);
    expect(chatChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Bob' }),
    );
  });
});

describe('PATCH /api/online/rooms/[code]/chat/[messageId]', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
    mockIsProfane.mockReturnValue(false);
  });

  it('returns 401 when no token', async () => {
    const res = await PATCH(makePatchRequest(), MSG_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makePatchRequest('token', { body: 'new text' }), MSG_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is empty', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await PATCH(makePatchRequest('token', { body: '' }), MSG_PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 422 when body is too long', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await PATCH(makePatchRequest('token', { body: 'x'.repeat(501) }), MSG_PARAMS);
    expect(res.status).toBe(422);
  });

  it('returns 422 when body contains profanity', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockIsProfane.mockReturnValue(true);
    const res = await PATCH(makePatchRequest('token', { body: 'badword' }), MSG_PARAMS);
    expect(res.status).toBe(422);
  });

  it('returns 404 when message not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    // default chain → maybeSingle resolves null
    const res = await PATCH(makePatchRequest('token', { body: 'edit' }), MSG_PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own message', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { ...BASE_MESSAGE, user_id: 'other-id' }, error: null } }) as never
    );
    const res = await PATCH(makePatchRequest('token', { body: 'edit' }), MSG_PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 422 when message is already deleted', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { ...BASE_MESSAGE, deleted_at: new Date().toISOString() }, error: null } }) as never
    );
    const res = await PATCH(makePatchRequest('token', { body: 'edit' }), MSG_PARAMS);
    expect(res.status).toBe(422);
  });

  it('returns 200 with updated message on success', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const updatedMsg = { ...BASE_MESSAGE, body: 'edited text', edited_at: new Date().toISOString() };

    // Two chains: one for the fetch (maybeSingle), one for the update (single)
    const fetchChain  = buildChain({ single: { data: BASE_MESSAGE, error: null } });
    const updateChain = buildChain({ single: { data: updatedMsg, error: null } });
    updateChain.update.mockReturnValue(updateChain);

    let callCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'online_chat_messages') {
        callCount++;
        return callCount === 1 ? fetchChain : updateChain;
      }
      return buildChain();
    });
    const res = await PATCH(makePatchRequest('token', { body: 'edited text' }), MSG_PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message.body).toBe('edited text');
  });
});

describe('DELETE /api/online/rooms/[code]/chat/[messageId]', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    vi.mocked(createClient).mockReturnValue(mockClient as never);
  });

  it('returns 401 when no token', async () => {
    const res = await DELETE(makeDeleteRequest(), MSG_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth fails', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeDeleteRequest('token'), MSG_PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 404 when message not found', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const res = await DELETE(makeDeleteRequest('token'), MSG_PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own message', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { ...BASE_MESSAGE, user_id: 'other-id' }, error: null } }) as never
    );
    const res = await DELETE(makeDeleteRequest('token'), MSG_PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 409 when message is already deleted', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockClient.from.mockReturnValue(
      buildChain({ single: { data: { ...BASE_MESSAGE, deleted_at: new Date().toISOString() }, error: null } }) as never
    );
    const res = await DELETE(makeDeleteRequest('token'), MSG_PARAMS);
    expect(res.status).toBe(409);
  });

  it('returns 200 and soft-deletes the message', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const chain = buildChain({ single: { data: BASE_MESSAGE, error: null } });
    mockClient.from.mockReturnValue(chain as never);

    const res = await DELETE(makeDeleteRequest('token'), MSG_PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ body: null }),
    );
  });
});
