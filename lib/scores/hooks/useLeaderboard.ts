'use client';

import useSWR from 'swr';
import { getScoresClient } from '../client';
import type { LeaderboardResult } from '../types';

export function useLeaderboard(
  gameSlug: string,
  ladderSlug: string,
  options?: { limit?: number; offset?: number }
) {
  const key = `leaderboard:${gameSlug}:${ladderSlug}:${options?.limit ?? 50}:${options?.offset ?? 0}`;

  return useSWR<LeaderboardResult>(
    key,
    () => getScoresClient().getLeaderboard(gameSlug, ladderSlug, options),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    }
  );
}
