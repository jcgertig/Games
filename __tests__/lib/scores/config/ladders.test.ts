import { describe, it, expect } from 'vitest';
import {
  LADDER_CONFIGS,
  LADDER_CONFIG_MAP,
  getLadderConfig,
  getLaddersForGame,
} from '@/lib/scores/config/ladders';

describe('LADDER_CONFIGS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(LADDER_CONFIGS)).toBe(true);
    expect(LADDER_CONFIGS.length).toBeGreaterThan(0);
  });

  it('contains tic-tac-toe global ladder', () => {
    const entry = LADDER_CONFIGS.find(
      (c) => c.gameSlug === 'tic-tac-toe' && c.ladderSlug === 'global'
    );
    expect(entry).toBeDefined();
    expect(entry?.scoreType).toBe('total_wins');
    expect(entry?.primaryLabel).toBe('Wins');
  });

  it('contains car-shot global ladder with composite score type', () => {
    const entry = LADDER_CONFIGS.find(
      (c) => c.gameSlug === 'car-shot' && c.ladderSlug === 'global'
    );
    expect(entry).toBeDefined();
    expect(entry?.scoreType).toBe('composite');
    expect(entry?.primaryLabel).toBe('Wheels');
    expect(entry?.secondaryLabel).toBe('Highest Level');
  });

  it('contains dancing-crab global ladder', () => {
    const entry = LADDER_CONFIGS.find(
      (c) => c.gameSlug === 'dancing-crab' && c.ladderSlug === 'global'
    );
    expect(entry).toBeDefined();
    expect(entry?.scoreType).toBe('composite');
    expect(entry?.primaryLabel).toBe('Score');
    expect(entry?.secondaryLabel).toBe('Accuracy %');
  });

  it('contains dancing-crab song ladders', () => {
    const songLadders = LADDER_CONFIGS.filter(
      (c) => c.gameSlug === 'dancing-crab' && c.ladderSlug.startsWith('song:')
    );
    expect(songLadders.length).toBeGreaterThanOrEqual(3);
    const slugs = songLadders.map((c) => c.ladderSlug);
    expect(slugs).toContain('song:night-owl');
    expect(slugs).toContain('song:dancing-fever');
    expect(slugs).toContain('song:crab-rave');
  });

  it('every entry has required fields', () => {
    for (const config of LADDER_CONFIGS) {
      expect(config.gameSlug).toBeTruthy();
      expect(config.ladderSlug).toBeTruthy();
      expect(config.name).toBeTruthy();
      expect(config.scoreType).toBeTruthy();
      expect(config.primaryLabel).toBeTruthy();
      expect(['asc', 'desc']).toContain(config.sortPrimary);
    }
  });

  it('every "gameSlug:ladderSlug" combination is unique', () => {
    const keys = LADDER_CONFIGS.map((c) => `${c.gameSlug}:${c.ladderSlug}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

describe('LADDER_CONFIG_MAP', () => {
  it('is a Map', () => {
    expect(LADDER_CONFIG_MAP).toBeInstanceOf(Map);
  });

  it('has the same number of entries as LADDER_CONFIGS', () => {
    expect(LADDER_CONFIG_MAP.size).toBe(LADDER_CONFIGS.length);
  });

  it('keys are in "gameSlug:ladderSlug" format', () => {
    for (const [key, config] of LADDER_CONFIG_MAP) {
      expect(key).toBe(`${config.gameSlug}:${config.ladderSlug}`);
    }
  });
});

describe('getLadderConfig', () => {
  it('returns the config for a known game + ladder', () => {
    const result = getLadderConfig('tic-tac-toe', 'global');
    expect(result).toBeDefined();
    expect(result?.gameSlug).toBe('tic-tac-toe');
    expect(result?.ladderSlug).toBe('global');
  });

  it('returns the dancing-crab global config', () => {
    const result = getLadderConfig('dancing-crab', 'global');
    expect(result?.scoreType).toBe('composite');
  });

  it('returns a song-specific ladder config', () => {
    const result = getLadderConfig('dancing-crab', 'song:night-owl');
    expect(result).toBeDefined();
    expect(result?.name).toBe('Night Owl');
  });

  it('returns undefined for an unknown game', () => {
    expect(getLadderConfig('unknown-game', 'global')).toBeUndefined();
  });

  it('returns undefined for an unknown ladder on a known game', () => {
    expect(getLadderConfig('tic-tac-toe', 'nonexistent')).toBeUndefined();
  });

  it('returns undefined when both params are empty strings', () => {
    expect(getLadderConfig('', '')).toBeUndefined();
  });
});

describe('getLaddersForGame', () => {
  it('returns all ladders for dancing-crab', () => {
    const results = getLaddersForGame('dancing-crab');
    expect(results.length).toBeGreaterThanOrEqual(4); // global + 3 songs
    expect(results.every((c) => c.gameSlug === 'dancing-crab')).toBe(true);
  });

  it('returns a single ladder for tic-tac-toe', () => {
    const results = getLaddersForGame('tic-tac-toe');
    expect(results).toHaveLength(1);
    expect(results[0].ladderSlug).toBe('global');
  });

  it('returns a single ladder for car-shot', () => {
    const results = getLaddersForGame('car-shot');
    expect(results).toHaveLength(1);
    expect(results[0].scoreType).toBe('composite');
  });

  it('returns an empty array for unknown game', () => {
    expect(getLaddersForGame('nonexistent-game')).toEqual([]);
  });

  it('does not mutate LADDER_CONFIGS when result is modified', () => {
    const originalLength = LADDER_CONFIGS.length;
    const results = getLaddersForGame('tic-tac-toe');
    results.push({ gameSlug: 'x', ladderSlug: 'y', name: 'X', scoreType: 'total_wins', primaryLabel: 'X', sortPrimary: 'desc' });
    expect(LADDER_CONFIGS.length).toBe(originalLength);
  });
});
