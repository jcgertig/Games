'use client';

import useSWR from 'swr';
import { getScoresClient } from '../client';
import type { PlayerStats } from '../types';

export function usePlayerStats(gameSlug: string) {
  return useSWR<PlayerStats | null>(
    `player-stats:${gameSlug}`,
    () => getScoresClient().getPlayerStats(gameSlug),
    {
      revalidateOnFocus: false,
    }
  );
}
