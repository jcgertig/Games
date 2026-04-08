import { vi } from 'vitest';

/**
 * Returns a chainable Supabase query builder mock.
 *
 * All intermediate methods (.select, .eq, .order, .in, etc.) return the chain.
 * Terminal methods (.single, .maybeSingle, .range, .insert) return resolved Promises.
 *
 * The chain is also thenable: `await chain` resolves to `defaults.await` (or
 * `defaults.single`) so routes that call `const { data } = await sb.from(...)...eq(...)`
 * without a terminal method can be mocked by passing `defaults.await`.
 */
export function buildChain(defaults: {
  single?: unknown;
  range?: unknown;
  insert?: unknown;
  /** Value resolved when the chain itself is awaited (no terminal method). */
  await?: unknown;
} = {}) {
  // Use a plain object so mockReturnValue(chain) gives back the same ref
  const chain = {
    select:      vi.fn(),
    eq:          vi.fn(),
    order:       vi.fn(),
    range:       vi.fn(),
    single:      vi.fn(),
    maybeSingle: vi.fn(),
    insert:      vi.fn(),
    in:          vi.fn(),
    is:          vi.fn(),
    not:         vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    filter:      vi.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  chain.filter.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);

  chain.single.mockResolvedValue(
    defaults.single ?? { data: null, error: null }
  );
  chain.maybeSingle.mockResolvedValue(
    defaults.single ?? { data: null, error: null }
  );
  chain.range.mockResolvedValue(
    defaults.range ?? { data: [], error: null, count: 0 }
  );
  chain.insert.mockResolvedValue(
    defaults.insert ?? { data: null, error: null }
  );

  // Make the chain itself thenable so routes can do:
  //   const { data } = await sb.from(...).select(...).eq(...)
  // without calling a terminal method.
  const awaitDefault = defaults.await ?? defaults.single ?? { data: null, error: null };
  (chain as any).then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(awaitDefault).then(onFulfilled, onRejected);

  return chain;
}

/**
 * Creates a complete Supabase client mock.
 * `fromImpl` is called with the table name on each `.from()` call so tests
 * can return different chains per table.
 */
export function createMockClient(fromImpl?: (table: string) => ReturnType<typeof buildChain>) {
  const defaultChain = buildChain();

  return {
    from: vi.fn((table: string) =>
      fromImpl ? fromImpl(table) : defaultChain
    ),
    auth: {
      getUser:    vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

/** Convenience: build a mock Supabase user */
export function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id-123',
    email: 'test@example.com',
    user_metadata: {},
    ...overrides,
  };
}

/** Convenience: build a mock Supabase session */
export function mockSession(userOverrides: Record<string, unknown> = {}) {
  return {
    user: mockUser(userOverrides),
    access_token: 'mock-access-token',
  };
}
