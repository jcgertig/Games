// ── Ladder & Game config ────────────────────────────────────────────────────

export type ScoreType = 'highest_score' | 'lowest_time' | 'total_wins' | 'composite' | 'running_avg';
export type SortDirection = 'asc' | 'desc';

export interface LadderConfig {
  gameSlug: string;
  ladderSlug: string;
  name: string;
  scoreType: ScoreType;
  primaryLabel: string;
  secondaryLabel?: string;
  sortPrimary: SortDirection;
  sortSecondary?: SortDirection;
}

// ── Score submission ────────────────────────────────────────────────────────

export interface SubmitScoreOptions {
  gameSlug: string;
  ladderSlug: string;
  primaryValue: number;
  secondaryValue?: number;
  metadata?: Record<string, unknown>;
}

export interface SubmitScoreResult {
  /** false when user skipped auth or was not logged in after modal */
  saved: boolean;
  isImprovement: boolean;
  rank: number;
}

// ── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  primaryValue: number;
  secondaryValue?: number;
  metadata: Record<string, unknown>;
  submittedAt: string;
  isCurrentUser: boolean;
}

export interface LeaderboardResult {
  ladder: LadderConfig;
  entries: LeaderboardEntry[];
  total: number;
}

// ── Player stats ────────────────────────────────────────────────────────────

export interface PlayerStats {
  plays: number;
  wins: number;
  losses: number;
  totalScore: number;
  bestScore?: number;
  bestTime?: number;
  extra: Record<string, unknown>;
  lastPlayedAt?: string;
}

export interface StatsDelta {
  plays?: number;
  wins?: number;
  losses?: number;
  totalScore?: number;
  bestScore?: number;
  bestTime?: number;
  extra?: Record<string, unknown>;
}

// ── Client config ───────────────────────────────────────────────────────────

export interface ScoresClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /**
   * Optional pre-built Supabase client to reuse. When provided the constructor
   * will NOT call createClient(), preventing duplicate GoTrueClient instances.
   */
  supabaseClient?: import('@supabase/supabase-js').SupabaseClient;
  /**
   * Called when submitScore needs the user to authenticate.
   * Resolves to 'logged_in' when the user successfully authenticates,
   * or 'skipped' when the user dismisses the modal.
   */
  onAuthRequired: () => Promise<'logged_in' | 'skipped'>;
}

// ── iframe bridge message types ─────────────────────────────────────────────

export type IframeBridgeMessage =
  | { type: 'SCORES_SUBMIT'; payload: SubmitScoreOptions }
  | { type: 'SCORES_UPDATE_STATS'; payload: { gameSlug: string; delta: StatsDelta } }
  | { type: 'SCORES_GET_PLAYER_STATS'; payload: { gameSlug: string; requestId: string } };

export type IframeBridgeResponse =
  | { type: 'SCORES_SUBMIT_RESULT'; payload: SubmitScoreResult }
  | { type: 'SCORES_PLAYER_STATS_RESULT'; payload: { requestId: string; stats: PlayerStats | null } };
