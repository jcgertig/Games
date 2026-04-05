// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ScoreType,
  SortDirection,
  LadderConfig,
  SubmitScoreOptions,
  SubmitScoreResult,
  LeaderboardEntry,
  LeaderboardResult,
  PlayerStats,
  StatsDelta,
  ScoresClientConfig,
  IframeBridgeMessage,
  IframeBridgeResponse,
} from './types';

// ── Client ────────────────────────────────────────────────────────────────────
export { ScoresClient, getScoresClient, initScoresClient } from './client';

// ── Ladder config ─────────────────────────────────────────────────────────────
export {
  LADDER_CONFIGS,
  LADDER_CONFIG_MAP,
  getLadderConfig,
  getLaddersForGame,
} from './config/ladders';

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useLeaderboard } from './hooks/useLeaderboard';
export { usePlayerStats } from './hooks/usePlayerStats';
export { useSubmitScore } from './hooks/useSubmitScore';

// ── iframe bridge ─────────────────────────────────────────────────────────────
export { attachIframeBridge } from './internal/iframe-bridge';

// ── Components ────────────────────────────────────────────────────────────────
export { AuthModal } from './components/AuthModal';
export { AuthModalProvider, useScoresClient } from './components/AuthModalProvider';
