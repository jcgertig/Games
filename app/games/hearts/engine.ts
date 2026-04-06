// ── Hearts game engine ────────────────────────────────────────────────────────
// Self-contained, framework-free Hearts rules engine.
// All state is plain JSON — safe to clone and pass across Phaser scenes.

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';
export type Card = string; // e.g. "2C", "QS", "AH", "10D"

export type PassDirection = 'left' | 'right' | 'across' | 'none';

export interface TrickCard {
  card: Card;
  playerIdx: number;
}

export interface HeartsPlayer {
  id: string;
  name: string;
  hand: Card[];
  gamePoints: number; // cumulative across hands
}

export type GamePhase =
  | 'dealing'
  | 'passing'
  | 'playing'
  | 'trick_end'   // brief pause between tricks
  | 'hand_end'    // scoring overlay between hands
  | 'game_over';

export interface HeartsState {
  players: HeartsPlayer[];
  phase: GamePhase;
  handNumber: number;          // 0-based; determines pass direction
  passDirection: PassDirection;
  pendingPasses: (Card[] | null)[]; // null = not yet chosen
  trickCards: TrickCard[];     // cards played so far in current trick
  trickLeadSuit: Suit | null;
  trickLeaderIdx: number;      // who led this trick
  currentPlayerIdx: number;
  heartsBroken: boolean;
  tricksPlayed: number;        // 0-12 within a hand
  handPoints: number[];        // points taken in THIS hand per player
  winnerIdx: number | null;    // set when phase === 'game_over'
}

// ── Card helpers ─────────────────────────────────────────────────────────────

const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS: Suit[] = ['C','D','H','S'];

export function parseCard(card: Card): { rank: Rank; suit: Suit } {
  const suit = card.slice(-1) as Suit;
  const rank = card.slice(0, -1) as Rank;
  return { rank, suit };
}

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

/** Point value of a single card in Hearts */
export function cardPoints(card: Card): number {
  const { rank, suit } = parseCard(card);
  if (suit === 'H') return 1;
  if (suit === 'S' && rank === 'Q') return 13;
  return 0;
}

/** Numeric comparison value for trick-winning (within a suit) */
export function cardStrength(card: Card): number {
  return rankIndex(parseCard(card).rank);
}

/** Build a standard 52-card deck */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

/** Fisher-Yates shuffle (returns a new array) */
export function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Deal a shuffled deck evenly to 4 players */
export function dealDeck(): Card[][] {
  const deck = shuffle(buildDeck());
  return [
    deck.slice(0, 13),
    deck.slice(13, 26),
    deck.slice(26, 39),
    deck.slice(39, 52),
  ];
}

/** Which direction to pass cards for a given hand number (0-based) */
export function passDirectionForHand(handNumber: number): PassDirection {
  const cycle = handNumber % 4;
  return (['left', 'right', 'across', 'none'] as PassDirection[])[cycle];
}

/** Target player index after passing in a given direction */
export function passTarget(fromIdx: number, direction: PassDirection): number {
  if (direction === 'left')   return (fromIdx + 1) % 4;
  if (direction === 'right')  return (fromIdx + 3) % 4;
  if (direction === 'across') return (fromIdx + 2) % 4;
  return fromIdx; // 'none'
}

/** Which player holds 2♣ */
export function holderOf2C(hands: Card[][]): number {
  return hands.findIndex(h => h.includes('2C'));
}

// ── Play validation ───────────────────────────────────────────────────────────

/**
 * Returns true if playing `card` is a legal move for `playerIdx`
 * given the current trick state.
 */
export function isLegalPlay(state: HeartsState, playerIdx: number, card: Card): boolean {
  const { rank, suit } = parseCard(card);
  const hand = state.players[playerIdx].hand;
  if (!hand.includes(card)) return false;

  // Very first card of the hand must be 2♣
  if (state.tricksPlayed === 0 && state.trickCards.length === 0) {
    return card === '2C';
  }

  // If leading a trick
  if (state.trickCards.length === 0) {
    // Cannot lead hearts unless broken or only hearts remain
    if (suit === 'H' && !state.heartsBroken) {
      const nonHearts = hand.filter(c => parseCard(c).suit !== 'H');
      if (nonHearts.length > 0) return false;
    }
    return true;
  }

  // Must follow suit if possible
  const ledSuit = state.trickLeadSuit!;
  const hasSuit = hand.some(c => parseCard(c).suit === ledSuit);
  if (hasSuit) return suit === ledSuit;

  // Can't follow suit — anything goes, but on trick 0 can't dump points
  if (state.tricksPlayed === 0) {
    const isPointCard = suit === 'H' || (suit === 'S' && rank === 'Q');
    if (isPointCard) {
      const noPoints = hand.filter(c => !isPointCardCheck(c));
      if (noPoints.length > 0) return false;
    }
  }
  return true;
}

function isPointCardCheck(card: Card): boolean {
  const { rank, suit } = parseCard(card);
  return suit === 'H' || (suit === 'S' && rank === 'Q');
}

/** All cards in `hand` that are legal to play right now */
export function legalPlays(state: HeartsState, playerIdx: number): Card[] {
  return state.players[playerIdx].hand.filter(c => isLegalPlay(state, playerIdx, c));
}

// ── Trick resolution ──────────────────────────────────────────────────────────

/** Index into trickCards of the winning entry */
export function trickWinnerEntry(trickCards: TrickCard[], ledSuit: Suit): TrickCard {
  const inSuit = trickCards.filter(tc => parseCard(tc.card).suit === ledSuit);
  return inSuit.reduce((best, tc) =>
    cardStrength(tc.card) > cardStrength(best.card) ? tc : best
  );
}

/** Sum of point cards in a trick */
export function trickPointValue(trickCards: TrickCard[]): number {
  return trickCards.reduce((sum, tc) => sum + cardPoints(tc.card), 0);
}

// ── Shoot the moon ────────────────────────────────────────────────────────────

/**
 * After a hand, check if any player shot the moon (took all 26 points).
 * Returns the playerIdx who did, or null if no one did.
 */
export function detectShootTheMoon(handPoints: number[]): number | null {
  const idx = handPoints.findIndex(p => p === 26);
  return idx >= 0 ? idx : null;
}

/** Apply shoot-the-moon: everyone else gets +26, shooter gets 0 */
export function applyShootTheMoon(handPoints: number[], shooterIdx: number): number[] {
  return handPoints.map((p, i) => (i === shooterIdx ? 0 : 26));
}

// ── State mutations ───────────────────────────────────────────────────────────

/** Create the initial state for a brand-new game */
export function createInitialState(playerNames: [string, string, string, string]): HeartsState {
  const hands = dealDeck();
  const passDir = passDirectionForHand(0);
  const firstPlayer = holderOf2C(hands);

  return {
    players: playerNames.map((name, i) => ({
      id: i === 0 ? 'human' : `bot${i}`,
      name,
      hand: hands[i],
      gamePoints: 0,
    })),
    phase: passDir === 'none' ? 'playing' : 'passing',
    handNumber: 0,
    passDirection: passDir,
    pendingPasses: [null, null, null, null],
    trickCards: [],
    trickLeadSuit: null,
    trickLeaderIdx: firstPlayer,
    currentPlayerIdx: firstPlayer,
    heartsBroken: false,
    tricksPlayed: 0,
    handPoints: [0, 0, 0, 0],
    winnerIdx: null,
  };
}

/** Register a player's chosen pass cards. Returns updated state. */
export function submitPass(state: HeartsState, playerIdx: number, cards: Card[]): HeartsState {
  if (state.phase !== 'passing') throw new Error('Not in passing phase');
  if (cards.length !== 3) throw new Error('Must pass exactly 3 cards');

  const newPending = [...state.pendingPasses];
  newPending[playerIdx] = cards;

  // If all 4 players have submitted, execute the passes
  if (newPending.every(p => p !== null)) {
    const newHands = state.players.map(p => [...p.hand]);

    for (let i = 0; i < 4; i++) {
      const target = passTarget(i, state.passDirection);
      const toPass = newPending[i]!;
      // Remove from source
      newHands[i] = newHands[i].filter(c => !toPass.includes(c));
      // Add to target
      newHands[target] = [...newHands[target], ...toPass];
    }

    const newPlayers = state.players.map((p, i) => ({ ...p, hand: newHands[i] }));
    const firstPlayer = holderOf2C(newHands);

    return {
      ...state,
      players: newPlayers,
      phase: 'playing',
      pendingPasses: [null, null, null, null],
      currentPlayerIdx: firstPlayer,
      trickLeaderIdx: firstPlayer,
    };
  }

  return { ...state, pendingPasses: newPending };
}

/** Apply a card play. Returns updated state. Caller must check isLegalPlay first. */
export function playCard(state: HeartsState, playerIdx: number, card: Card): HeartsState {
  const { suit } = parseCard(card);

  // Remove card from hand
  const newPlayers = state.players.map((p, i) =>
    i === playerIdx ? { ...p, hand: p.hand.filter(c => c !== card) } : p
  );

  const newTrickCards: TrickCard[] = [...state.trickCards, { card, playerIdx }];
  const newLeadSuit = state.trickCards.length === 0 ? suit : state.trickLeadSuit;
  const newHeartsBroken = state.heartsBroken || suit === 'H';

  // Not yet a full trick
  if (newTrickCards.length < 4) {
    // Advance to next player clockwise
    const next = (playerIdx + 1) % 4;
    return {
      ...state,
      players: newPlayers,
      trickCards: newTrickCards,
      trickLeadSuit: newLeadSuit,
      heartsBroken: newHeartsBroken,
      currentPlayerIdx: next,
    };
  }

  // Trick complete — resolve winner
  const winEntry = trickWinnerEntry(newTrickCards, newLeadSuit!);
  const trickPts = trickPointValue(newTrickCards);
  const newHandPoints = state.handPoints.map((p, i) =>
    i === winEntry.playerIdx ? p + trickPts : p
  );
  const newTricksPlayed = state.tricksPlayed + 1;

  if (newTricksPlayed === 13) {
    // Hand over — calculate scores
    let finalHandPoints = [...newHandPoints];
    const shooter = detectShootTheMoon(finalHandPoints);
    if (shooter !== null) {
      finalHandPoints = applyShootTheMoon(finalHandPoints, shooter);
    }

    const newGamePoints = state.players.map((p, i) => p.gamePoints + finalHandPoints[i]);
    const updatedPlayers = newPlayers.map((p, i) => ({ ...p, gamePoints: newGamePoints[i] }));

    // Check game-over (anyone ≥ 100)
    const gameOver = newGamePoints.some(pts => pts >= 100);
    if (gameOver) {
      const minPts = Math.min(...newGamePoints);
      const winnerIdx = newGamePoints.indexOf(minPts);
      return {
        ...state,
        players: updatedPlayers,
        phase: 'game_over',
        trickCards: newTrickCards,
        trickLeadSuit: newLeadSuit,
        heartsBroken: newHeartsBroken,
        handPoints: finalHandPoints,
        tricksPlayed: newTricksPlayed,
        winnerIdx,
      };
    }

    // Start new hand
    return {
      ...state,
      players: updatedPlayers,
      phase: 'hand_end',
      trickCards: newTrickCards,
      trickLeadSuit: newLeadSuit,
      heartsBroken: newHeartsBroken,
      handPoints: finalHandPoints,
      tricksPlayed: newTricksPlayed,
      winnerIdx: null,
    };
  }

  // More tricks to play — winner leads next
  return {
    ...state,
    players: newPlayers,
    phase: 'trick_end',
    trickCards: newTrickCards,
    trickLeadSuit: newLeadSuit,
    heartsBroken: newHeartsBroken,
    handPoints: newHandPoints,
    tricksPlayed: newTricksPlayed,
    currentPlayerIdx: winEntry.playerIdx,
    trickLeaderIdx: winEntry.playerIdx,
    winnerIdx: null,
  };
}

/** Advance from trick_end to the next trick */
export function startNextTrick(state: HeartsState): HeartsState {
  if (state.phase !== 'trick_end') throw new Error('Not in trick_end phase');
  return {
    ...state,
    phase: 'playing',
    trickCards: [],
    trickLeadSuit: null,
  };
}

/** Start a new hand after hand_end */
export function startNewHand(state: HeartsState): HeartsState {
  if (state.phase !== 'hand_end') throw new Error('Not in hand_end phase');

  const newHandNumber = state.handNumber + 1;
  const passDir = passDirectionForHand(newHandNumber);
  const hands = dealDeck();
  const firstPlayer = holderOf2C(hands);

  return {
    ...state,
    players: state.players.map((p, i) => ({ ...p, hand: hands[i] })),
    phase: passDir === 'none' ? 'playing' : 'passing',
    handNumber: newHandNumber,
    passDirection: passDir,
    pendingPasses: [null, null, null, null],
    trickCards: [],
    trickLeadSuit: null,
    trickLeaderIdx: firstPlayer,
    currentPlayerIdx: firstPlayer,
    heartsBroken: false,
    tricksPlayed: 0,
    handPoints: [0, 0, 0, 0],
  };
}
