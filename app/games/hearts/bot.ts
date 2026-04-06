// ── Hearts bot AI ─────────────────────────────────────────────────────────────
// Uses @card-games/engine's Game.checkAllowedPlay() for legal-move validation
// and adds rule-based strategy on top.

import type { Game } from '@card-games/engine';
import { cardStrength, cardPoints, parseCard, trickWinner } from './engine';
import type { Card, PassDirection, TrickCard } from './engine';

// ── Passing ───────────────────────────────────────────────────────────────────

/**
 * Choose 3 cards to pass. Sheds the most dangerous cards first:
 * Q♠ > A♠ > K♠ > A♥ > K♥ > J♠ > high hearts … then highest overall.
 */
export function chooseBotPass(hand: Card[], _direction: PassDirection): Card[] {
  const dangerOrder = ['QS','AS','KS','AH','KH','JS','QH','JH'];

  const danger: Card[] = [];
  const high:   Card[] = [];
  const rest:   Card[] = [];

  for (const card of hand) {
    if (dangerOrder.includes(card)) {
      danger.push(card);
    } else if (['A','K','Q','J'].includes(parseCard(card).rank)) {
      high.push(card);
    } else {
      rest.push(card);
    }
  }

  danger.sort((a, b) => dangerOrder.indexOf(a) - dangerOrder.indexOf(b));
  high.sort((a, b) => cardStrength(b) - cardStrength(a));

  return [...danger, ...high, ...rest].slice(0, 3);
}

// ── Playing ───────────────────────────────────────────────────────────────────

/**
 * Choose a card to play using the engine's checkAllowedPlay() for validation.
 * Strategy:
 *  - Leading: play lowest safe card; avoid leading into dangerous suits
 *  - Following suit: duck point tricks; win cheap tricks safely
 *  - Discarding (void in led suit): dump Q♠ first, then high hearts
 */
export function chooseBotPlay(
  game: Game,
  playerIdx: number,
  trickCards: TrickCard[],
  ledSuit: string | null,
): Card {
  // Get the current player's hand from the engine state
  const state = game.asJSON();
  const hand  = state.rounds[state.currentRoundIdx].players[playerIdx].hand as Card[];

  // Filter to only the cards the engine considers legal right now
  const legal = hand.filter(card => {
    try { return (game as any).checkAllowedPlay([card], 'table'); }
    catch { return false; }
  });

  if (legal.length === 0) return hand[0]; // should never happen
  if (legal.length === 1) return legal[0];

  // ── Leading ───────────────────────────────────────────────────────────────
  if (trickCards.length === 0) {
    return chooseLead(legal);
  }

  // ── Following suit ────────────────────────────────────────────────────────
  const followCards = legal.filter(c => parseCard(c).suit === ledSuit);
  if (followCards.length > 0) {
    return chooseFollowSuit(followCards, trickCards, ledSuit!);
  }

  // ── Discard ───────────────────────────────────────────────────────────────
  return chooseDiscard(legal);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function chooseLead(legal: Card[]): Card {
  const noQS = legal.filter(c => c !== 'QS');
  const pool = noQS.length > 0 ? noQS : legal;

  const nonHearts = pool.filter(c => parseCard(c).suit !== 'H');
  const candidates = nonHearts.length > 0 ? nonHearts : pool;

  // Lead lowest to stay out of trouble
  return candidates.reduce((best, c) =>
    cardStrength(c) < cardStrength(best) ? c : best
  );
}

function chooseFollowSuit(
  followCards: Card[],
  trickCards:  TrickCard[],
  ledSuit:     string,
): Card {
  const winnerIdx = trickWinner(trickCards, ledSuit as any);
  const winEntry  = trickCards.find(tc => tc.playerIdx === winnerIdx)!;
  const winStrength = cardStrength(winEntry.card);

  const trickHasPoints = trickCards.some(tc => cardPoints(tc.card) > 0);
  const winningCards   = followCards.filter(c => cardStrength(c) > winStrength);
  const losingCards    = followCards.filter(c => cardStrength(c) <= winStrength);

  if (trickHasPoints) {
    // Avoid winning — play highest card that still loses
    if (losingCards.length > 0) {
      return losingCards.reduce((best, c) =>
        cardStrength(c) > cardStrength(best) ? c : best
      );
    }
    // Forced to win — take it with the lowest winning card
    return winningCards.reduce((best, c) =>
      cardStrength(c) < cardStrength(best) ? c : best
    );
  }

  // No points in trick — winning is fine; take it cheaply
  if (winningCards.length > 0) {
    return winningCards.reduce((best, c) =>
      cardStrength(c) < cardStrength(best) ? c : best
    );
  }

  return followCards.reduce((best, c) =>
    cardStrength(c) > cardStrength(best) ? c : best
  );
}

function chooseDiscard(legal: Card[]): Card {
  if (legal.includes('QS')) return 'QS';

  const hearts = legal
    .filter(c => parseCard(c).suit === 'H')
    .sort((a, b) => cardStrength(b) - cardStrength(a));
  if (hearts.length > 0) return hearts[0];

  return legal.reduce((best, c) =>
    cardStrength(c) > cardStrength(best) ? c : best
  );
}
