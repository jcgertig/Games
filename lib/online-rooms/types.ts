// ── Player action ─────────────────────────────────────────────────────────────

/** A typed action sent from a human player to the server. */
export interface PlayerAction {
  /** e.g. 'play', 'pass', 'bid' */
  type: string;
  /** Game-specific payload shape */
  payload: unknown;
}

// ── Per-game configuration ────────────────────────────────────────────────────

/**
 * Implement this interface for each game and register it in
 * `app/api/online/_registry.ts`. The generic API routes dispatch to the
 * correct implementation at runtime via the game registry.
 *
 * All methods are called server-side only (inside API route handlers).
 */
export interface OnlineGameConfig<TState> {
  /** Matches the game_slug column in online_rooms. */
  gameSlug: string;

  /** Number of seats per room (e.g. 4 for Hearts, 2 for Gin Rummy). */
  maxSeats: number;

  /**
   * Display names for bot players pre-created when the room is made.
   * Length must equal maxSeats - 1.
   */
  defaultBotNames: string[];

  /** Build the initial JSONB state written when a room is created. */
  createWaitingState(playerNames: string[], isBot: boolean[]): TState;

  /**
   * Called by the start route. Deal cards, run bots until the first human
   * turn is required, and return the new state.
   */
  startGame(state: TState): TState;

  /**
   * Validate and apply a human player action, then run any automated
   * bot turns, and return the new state.
   * Throw with a descriptive message on illegal moves — the action route
   * returns 422 with that message.
   */
  applyAction(state: TState, seat: number, action: PlayerAction): TState;

  /**
   * Returns true when the game is over and the room should be marked
   * status = 'done'. Called after every applyAction.
   */
  isGameOver(state: TState): boolean;

  /**
   * Update any player-metadata fields in the state when a human joins and
   * claims a bot seat. Returns the patched state.
   */
  patchPlayerName(state: TState, seat: number, displayName: string): TState;

  /**
   * Replace a human player's seat with a bot mid-game (e.g. when they leave).
   * Should flip isBot[seat] and advance() if it's now the bot's turn.
   */
  replaceWithBot?(state: TState, seat: number, botName: string): TState;

  /**
   * Restore a bot seat to a human (e.g. when a spectator claims a seat).
   * Should flip isBot[seat] back to false and update the player name.
   */
  restoreHuman?(state: TState, seat: number, displayName: string): TState;
}

// ── Shared client-side types ──────────────────────────────────────────────────

export type RoomStatus = 'loading' | 'waiting' | 'playing' | 'done' | 'error';

export interface SeatInfo {
  seat: number;
  display_name: string;
  is_bot: boolean;
  user_id: string | null;
}

export interface SpectatorInfo {
  user_id: string;
  display_name: string;
}
