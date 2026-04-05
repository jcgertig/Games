import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ScoresClientConfig,
  SubmitScoreOptions,
  SubmitScoreResult,
  LeaderboardResult,
  PlayerStats,
  StatsDelta,
} from './types';

export class ScoresClient {
  private supabase: SupabaseClient;
  private config: ScoresClientConfig;

  constructor(config: ScoresClientConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  // ── submitScore ──────────────────────────────────────────────────────────
  // If the user is not logged in, triggers the auth modal first.
  // If the user skips, returns { saved: false }.
  async submitScore(options: SubmitScoreOptions): Promise<SubmitScoreResult> {
    let { data: { session } } = await this.supabase.auth.getSession();

    if (!session) {
      const outcome = await this.config.onAuthRequired();
      if (outcome === 'skipped') {
        return { saved: false, isImprovement: false, rank: 0 };
      }
      // Re-check after auth
      const { data: { session: refreshed } } = await this.supabase.auth.getSession();
      if (!refreshed) {
        return { saved: false, isImprovement: false, rank: 0 };
      }
      session = refreshed;
    }

    const response = await fetch('/api/scores/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        gameSlug:       options.gameSlug,
        ladderSlug:     options.ladderSlug,
        primaryValue:   options.primaryValue,
        secondaryValue: options.secondaryValue,
        metadata:       options.metadata ?? {},
        clientTs:       new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Score submission failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return {
      saved:         true,
      isImprovement: data.isImprovement,
      rank:          data.rank,
    };
  }

  // ── getLeaderboard ───────────────────────────────────────────────────────
  async getLeaderboard(
    gameSlug: string,
    ladderSlug: string,
    options?: { limit?: number; offset?: number }
  ): Promise<LeaderboardResult> {
    const params = new URLSearchParams({
      gameSlug,
      ladderSlug,
      limit:  String(options?.limit  ?? 50),
      offset: String(options?.offset ?? 0),
    });
    const response = await fetch(`/api/scores/leaderboard?${params}`);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  }

  // ── getPlayerStats ───────────────────────────────────────────────────────
  async getPlayerStats(gameSlug: string): Promise<PlayerStats | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(`/api/scores/player/stats?gameSlug=${gameSlug}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch player stats');
    return response.json();
  }

  // ── updatePlayerStats ────────────────────────────────────────────────────
  // Silently no-ops if the user is not logged in.
  async updatePlayerStats(gameSlug: string, delta: StatsDelta): Promise<void> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session) return;

    await fetch('/api/scores/player/stats', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ gameSlug, delta }),
    });
  }

  // ── auth helpers ─────────────────────────────────────────────────────────
  getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }
}

// ── Singleton management ─────────────────────────────────────────────────────

let _client: ScoresClient | null = null;

export function getScoresClient(): ScoresClient {
  if (!_client) {
    throw new Error(
      'ScoresClient not initialized. Wrap your app in <AuthModalProvider>.'
    );
  }
  return _client;
}

export function initScoresClient(config: ScoresClientConfig): ScoresClient {
  _client = new ScoresClient(config);
  return _client;
}
