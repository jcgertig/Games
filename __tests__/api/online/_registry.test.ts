import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/api/online/_games/hearts', () => ({
  heartsConfig: { gameSlug: 'hearts', maxSeats: 4, defaultBotNames: [] },
}));

import { getGameConfig } from '@/app/api/online/_registry';

describe('getGameConfig', () => {
  it('returns the config for a registered slug', () => {
    const cfg = getGameConfig('hearts');
    expect(cfg).toBeDefined();
    expect((cfg as any).gameSlug).toBe('hearts');
  });

  it('throws with status 404 for an unknown slug', () => {
    let err: any;
    try { getGameConfig('unknown-game'); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.status).toBe(404);
    expect(err.message).toContain('unknown-game');
  });
});
