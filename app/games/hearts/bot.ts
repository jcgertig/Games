// ── Hearts bot AI ─────────────────────────────────────────────────────────────
// Rule-based strategy for bot players. Pure functions — no side effects.

import {
  Card,
  HeartsState,
  PassDirection,
  legalPlays,
  parseCard,
  cardStrength,
  trickWinnerEntry,
} from './engine';

// ── Passing ───────────────────────────────────────────────────────────────────

/**
 * Choose 3 cards to pass. Strategy: shed dangerous high-point cards first.
 * Priority: Q♠, A♠, K♠, A♥, K♥, J♠ … then highest remaining.
 */
export function chooseBotPass(hand: Card[], _direction: PassDirection): Card[] {
  const danger: Card[] = [];
  const highCards: Card[] = [];
  const rest: Card[] = [];

  // Categorise
  const dangerOrder = ['QS', 'AS', 'KS', 'AH', 'KH', 'JS', 'QH', 'JH'];
  for (const card of hand) {
    if (dangerOrder.includes(card)) danger.push(card);
    else {
      const { rank } = parseCard(card);
      if (['A', 'K', 'Q', 'J'].includes(rank)) highCards.push(card);
      else rest.push(card);
    }
  }

  // Sort danger cards by the danger priority order
  danger.sort((a, b) => dangerOrder.indexOf(a) - dangerOrder.indexOf(b));

  // Sort high cards by strength descending
  highCards.sort((a, b) => cardStrength(b) - cardStrength(a));

  // Build pass list: danger first, then high cards, then random filler
  const pool = [...danger, ...highCards, ...rest];
  return pool.slice(0, 3);
}

// ── Playing ───────────────────────────────────────────────────────────────────

/**
 * Choose a card to play. The bot tries to:
 *  - Avoid winning tricks that contain points
 *  - Dump Q♠ or high hearts when it can't follow suit
 *  - Win cheap tricks to control the lead when safe
 */
export function chooseBotPlay(state: HeartsState, playerIdx: number): Card {
  const legal = legalPlays(state, playerIdx);
  if (legal.length === 1) return legal[0];

  const { trickCards, trickLeadSuit } = state;

  // ── Leading a trick ───────────────────────────────────────────────────────
  if (trickCards.length === 0) {
    return chooseLead(legal, state, playerIdx);
  }

  // ── Following suit ────────────────────────────────────────────────────────
  const ledSuit = trickLeadSuit!;
  const followCards = legal.filter(c => parseCard(c).suit === ledSuit);

  if (followCards.length > 0) {
    return chooseFollowSuit(followCards, trickCards, ledSuit, state, playerIdx);
  }

  // ── Discarding (can't follow suit) ────────────────────────────────────────
  return chooseDiscard(legal);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function chooseLead(legal: Card[], state: HeartsState, _playerIdx: number): Card {
  // Never lead Q♠ (others can dump on us easily)
  const noQueenSpades = legal.filter(c => c !== 'QS');
  const pool = noQueenSpades.length > 0 ? noQueenSpades : legal;

  // Prefer non-hearts unless hearts are broken
  const nonHearts = pool.filter(c => parseCard(c).suit !== 'H');
  const candidates = nonHearts.length > 0 ? nonHearts : pool;

  // Lead lowest to probe the table
  return candidates.reduce((best, c) => cardStrength(c) < cardStrength(best) ? c : best);
}

function chooseFollowSuit(
  followCards: Card[],
  trickCards: { card: Card; playerIdx: number }[],
  ledSuit: string,
  _state: HeartsState,
  _playerIdx: number
): Card {
  const currentWinner = trickWinnerEntry(trickCards, ledSuit as any);
  const trickHasPoints = trickCards.some(tc => {
    const { rank, suit } = parseCard(tc.card);
    return suit === 'H' || (suit === 'S' && rank === 'Q');
  });

  const winnerStrength = cardStrength(currentWinner.card);

  // Cards that would win
  const winningCards = followCards.filter(c => cardStrength(c) > winnerStrength);
  // Cards that would lose
  const losingCards  = followCards.filter(c => cardStrength(c) <= winnerStrength);

  if (trickHasPoints) {
    // Trick contains points — try hard NOT to win it
    if (losingCards.length > 0) {
      // Play highest card that still loses (maximise denial without winning)
      return losingCards.reduce((best, c) => cardStrength(c) > cardStrength(best) ? c : best);
    }
    // Forced to win — play lowest winning card
    return winningCards.reduce((best, c) => cardStrength(c) < cardStrength(best) ? c : best);
  }

  // Trick has no points — winning is fine
  if (winningCards.length > 0) {
    // Win with lowest winning card to preserve high cards
    return winningCards.reduce((best, c) => cardStrength(c) < cardStrength(best) ? c : best);
  }

  // Can't win — play highest that still loses (unblock low cards for later leads)
  return followCards.reduce((best, c) => cardStrength(c) > cardStrength(best) ? c : best);
}

function chooseDiscard(legal: Card[]): Card {
  // Priority: dump Q♠ first, then high hearts, then highest overall
  if (legal.includes('QS')) return 'QS';

  const hearts = legal
    .filter(c => parseCard(c).suit === 'H')
    .sort((a, b) => cardStrength(b) - cardStrength(a));
  if (hearts.length > 0) return hearts[0];

  // Otherwise dump highest card
  return legal.reduce((best, c) => cardStrength(c) > cardStrength(best) ? c : best);
}
