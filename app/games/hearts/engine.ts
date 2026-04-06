// ── Hearts engine ─────────────────────────────────────────────────────────────
// Re-exports the @card-games/engine primitives used by the game, plus the
// Hearts-specific helpers the engine doesn't cover: card point values,
// trick winner calculation, shoot-the-moon, and a safe pass applicator that
// works around a player-0 bug in the engine's own pass() method (0 is falsy,
// so `playerIdxOverride || currentPlayerIdx` resolves to currentPlayerIdx
// when playerIdx === 0).

export { Game, games, findPlayableHand } from '@card-games/engine';

// ── Card helpers ──────────────────────────────────────────────────────────────

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Card = string; // e.g. "2C", "QS", "AH", "10D"
export type PassDirection = 'left' | 'right' | 'across' | 'none';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] as const;

export function parseCard(card: Card): { rank: string; suit: Suit } {
  return { suit: card.slice(-1) as Suit, rank: card.slice(0, -1) };
}

export function rankIndex(rank: string): number {
  return RANKS.indexOf(rank as typeof RANKS[number]);
}

/** Numeric strength for comparing within a suit (higher = stronger) */
export function cardStrength(card: Card): number {
  return rankIndex(parseCard(card).rank);
}

/** Hearts scoring: each ♥ = 1 pt, Q♠ = 13 pts, everything else = 0 */
export function cardPoints(card: Card): number {
  const { rank, suit } = parseCard(card);
  if (suit === 'H') return 1;
  if (suit === 'S' && rank === 'Q') return 13;
  return 0;
}

// ── Pass direction ────────────────────────────────────────────────────────────

/** Pass direction for a given 0-based hand number (Left / Right / Across / None) */
export function passDirectionForHand(handNumber: number): PassDirection {
  return (['left', 'right', 'across', 'none'] as PassDirection[])[handNumber % 4];
}

/** Player index that cards are passed TO from `fromIdx` */
export function passTarget(fromIdx: number, direction: PassDirection): number {
  if (direction === 'left')   return (fromIdx + 1) % 4;
  if (direction === 'right')  return (fromIdx + 3) % 4;
  if (direction === 'across') return (fromIdx + 2) % 4;
  return fromIdx;
}

// ── Trick resolution ──────────────────────────────────────────────────────────

export interface TrickCard { card: Card; playerIdx: number }

/**
 * Determine the trick winner: the highest-ranked card of the led suit.
 * The engine's built-in winConditions uses poker value across all suits,
 * which does not enforce the "only the led suit can win" rule, so we
 * calculate the winner independently here.
 */
export function trickWinner(trickCards: TrickCard[], ledSuit: Suit): number {
  const inSuit = trickCards.filter(tc => parseCard(tc.card).suit === ledSuit);
  return inSuit.reduce((best, tc) =>
    cardStrength(tc.card) > cardStrength(best.card) ? tc : best
  ).playerIdx;
}

// ── Shoot the moon ────────────────────────────────────────────────────────────

/** Returns the playerIdx who shot the moon (took all 26 pts), or null */
export function detectShootTheMoon(handPoints: number[]): number | null {
  const idx = handPoints.findIndex(p => p === 26);
  return idx >= 0 ? idx : null;
}

/** Apply shoot-the-moon: shooter gets 0, everyone else gets +26 */
export function applyShootTheMoon(handPoints: number[], shooter: number): number[] {
  return handPoints.map((_, i) => (i === shooter ? 0 : 26));
}

// ── Safe card passing ─────────────────────────────────────────────────────────

/**
 * Apply all four players' passes directly on the serialised game state and
 * return a fresh Game instance with the updated hands.
 *
 * Why not use game.pass()? The engine internally does:
 *   const playerIdx = playerIdxOverride || this.currentPlayerIdx
 * Because 0 is falsy, calling pass(0, cards) silently uses currentPlayerIdx
 * instead of 0, moving cards from the wrong player's hand.
 * Patching the JSON state and reconstructing avoids this entirely.
 */
export function applyPasses(
  game: InstanceType<typeof import('@card-games/engine').Game>,
  passes: Card[][],        // passes[playerIdx] = 3 cards that player passes
  direction: PassDirection,
): InstanceType<typeof import('@card-games/engine').Game> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Game } = require('@card-games/engine') as typeof import('@card-games/engine');

  const state = game.asJSON();
  const roundIdx = state.currentRoundIdx;

  // Deep-clone so we don't mutate the live state
  const newState = JSON.parse(JSON.stringify(state));
  const players  = newState.rounds[roundIdx].players as Array<{ hand: Card[] }>;

  // Move cards
  for (let i = 0; i < 4; i++) {
    const target  = passTarget(i, direction);
    const toPass  = passes[i];
    players[i].hand  = players[i].hand.filter((c: Card) => !toPass.includes(c));
    players[target].hand = [...players[target].hand, ...toPass];
  }

  // Re-seat first player (holder of 2C after passing)
  const firstPlayer = players.findIndex(p => p.hand.includes('2C'));
  newState.rounds[roundIdx].firstPlayerIdx   = firstPlayer;
  newState.rounds[roundIdx].currentPlayerIdx = firstPlayer;

  return new Game({ options: newState });
}
