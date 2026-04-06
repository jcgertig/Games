import type { LadderConfig } from '../types';

export const LADDER_CONFIGS: LadderConfig[] = [
  // ── Tic Tac Toe ──────────────────────────────────────────────────────────
  {
    gameSlug:     'tic-tac-toe',
    ladderSlug:   'global',
    name:         'Global Wins',
    scoreType:    'total_wins',
    primaryLabel: 'Wins',
    sortPrimary:  'desc',
  },

  // ── Car Shot ─────────────────────────────────────────────────────────────
  {
    gameSlug:        'car-shot',
    ladderSlug:      'global',
    name:            'Global',
    scoreType:       'composite',
    primaryLabel:    'Wheels',
    secondaryLabel:  'Highest Level',
    sortPrimary:     'desc',
    sortSecondary:   'desc',
  },

  // ── Hearts ───────────────────────────────────────────────────────────────
  {
    gameSlug:     'hearts',
    ladderSlug:   'global',
    name:         'Global Wins',
    scoreType:    'total_wins',
    primaryLabel: 'Wins',
    sortPrimary:  'desc',
  },

  // ── Dancing Crab ─────────────────────────────────────────────────────────
  {
    gameSlug:        'dancing-crab',
    ladderSlug:      'global',
    name:            'Global',
    scoreType:       'composite',
    primaryLabel:    'Score',
    secondaryLabel:  'Accuracy %',
    sortPrimary:     'desc',
    sortSecondary:   'desc',
  },
  {
    gameSlug:        'dancing-crab',
    ladderSlug:      'song:night-owl',
    name:            'Night Owl',
    scoreType:       'composite',
    primaryLabel:    'Score',
    secondaryLabel:  'Accuracy %',
    sortPrimary:     'desc',
    sortSecondary:   'desc',
  },
  {
    gameSlug:        'dancing-crab',
    ladderSlug:      'song:dancing-fever',
    name:            'Dancing Fever',
    scoreType:       'composite',
    primaryLabel:    'Score',
    secondaryLabel:  'Accuracy %',
    sortPrimary:     'desc',
    sortSecondary:   'desc',
  },
  {
    gameSlug:        'dancing-crab',
    ladderSlug:      'song:crab-rave',
    name:            'Crab Rave',
    scoreType:       'composite',
    primaryLabel:    'Score',
    secondaryLabel:  'Accuracy %',
    sortPrimary:     'desc',
    sortSecondary:   'desc',
  },
];

// Indexed lookup: "gameSlug:ladderSlug" → LadderConfig
export const LADDER_CONFIG_MAP = new Map<string, LadderConfig>(
  LADDER_CONFIGS.map((c) => [`${c.gameSlug}:${c.ladderSlug}`, c])
);

export function getLadderConfig(
  gameSlug: string,
  ladderSlug: string
): LadderConfig | undefined {
  return LADDER_CONFIG_MAP.get(`${gameSlug}:${ladderSlug}`);
}

/** All ladder slugs for a given game */
export function getLaddersForGame(gameSlug: string): LadderConfig[] {
  return LADDER_CONFIGS.filter((c) => c.gameSlug === gameSlug);
}
