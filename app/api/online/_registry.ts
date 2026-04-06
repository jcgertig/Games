/**
 * Server-side game registry.
 *
 * Maps gameSlug → OnlineGameConfig. Import getGameConfig() in every
 * /api/online route that needs to dispatch to game logic.
 *
 * To add a new game:
 *   1. Create app/api/online/_games/<slug>.ts implementing OnlineGameConfig
 *   2. Import it here and add it to the registry map
 */

import type { OnlineGameConfig } from '@/lib/online-rooms/types';
import { heartsConfig } from './_games/hearts';

const registry = new Map<string, OnlineGameConfig<unknown>>([
  ['hearts', heartsConfig as OnlineGameConfig<unknown>],
  // ['deuces', deucesConfig as OnlineGameConfig<unknown>],
]);

export function getGameConfig(gameSlug: string): OnlineGameConfig<unknown> {
  const cfg = registry.get(gameSlug);
  if (!cfg) throw Object.assign(new Error(`Unknown game: "${gameSlug}"`), { status: 404 });
  return cfg;
}
