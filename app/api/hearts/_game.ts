/**
 * Server-side Hearts multiplayer game logic.
 *
 * Mirrors the solo GameScene logic but operates on a plain serialisable state
 * object so it can be stored in Postgres and broadcast via Supabase Realtime.
 *
 * Public API:
 *   createWaitingState()  – blank state before a game starts
 *   startGame()           – deal cards, run bots until a human seat is needed
 *   humanPlay()           – validate + apply a card play, run bots
 *   humanPass()           – record a pass selection, run bots if all done
 */

import { Game, games } from '@card-games/engine';
import {
  passDirectionForHand,
  applyPasses as engineApplyPasses,
  trickWinner,
  cardPoints,
  detectShootTheMoon,
  applyShootTheMoon,
  parseCard,
} from '@/app/games/hearts/engine';
import { chooseBotPlay, chooseBotPass } from '@/app/games/hearts/bot';

// ── State type ────────────────────────────────────────────────────────────────

export interface HeartsRoomState {
  /** Broad game phase */
  phase: 'waiting' | 'passing' | 'playing' | 'hand_end' | 'game_over';

  /** All four hands (card strings). Clients render non-own hands face-down. */
  hands: string[][];

  /** Cumulative game-level points per seat */
  gamePoints: number[];

  /** Points earned so far in the current hand */
  handPoints: number[];

  heartsBroken: boolean;

  /** Cards played in the current trick, in play order */
  trickCards: { card: string; seat: number }[];

  trickLedSuit: string | null;
  tricksInHand: number;
  handNumber: number;

  /** Index of the seat whose turn it currently is */
  curSeat: number;

  passDirection: string;

  /** null = seat has not submitted pass yet; string[] = their 3 chosen cards */
  passSelections: (string[] | null)[];

  /** Index of the game winner (lowest score when someone hits 100) */
  winnerSeat: number | null;

  /** Display names indexed by seat */
  playerNames: string[];

  /** true = that seat is a server-controlled bot */
  isBot: boolean[];

  /** @card-games/engine serialised state — used server-side for validation */
  engineJson: any;
}

// ── Engine helpers ────────────────────────────────────────────────────────────

function makeGame(engineJson: any): any {
  return new Game({ options: engineJson });
}

function getLegalPlays(
  game: any,
  seat: number,
  trickCards: { card: string; seat: number }[],
  trickLedSuit: string | null,
  heartsBroken: boolean,
  tricksInHand: number,
): string[] {
  const json = game.asJSON();
  const hand: string[] = [...json.rounds[json.currentRoundIdx].players[seat].hand];

  if (trickCards.length === 0) {
    // Leading
    if (tricksInHand === 0) return hand.includes('2C') ? ['2C'] : hand;
    if (!heartsBroken) {
      const nh = hand.filter((c) => parseCard(c).suit !== 'H');
      return nh.length > 0 ? nh : hand;
    }
    return hand;
  }

  // Following — delegate to engine's checkAllowedPlay for follow-suit rule
  return hand.filter((card) => {
    try { return game.checkAllowedPlay([card], 'table'); }
    catch { return false; }
  });
}

// ── Atomic state transitions (no recursion) ───────────────────────────────────

function applyCardPlay(
  s: HeartsRoomState,
  seat: number,
  card: string,
): HeartsRoomState {
  const g = makeGame(s.engineJson);

  const trickLedSuit =
    s.trickCards.length === 0 ? parseCard(card).suit : s.trickLedSuit;
  const heartsBroken = s.heartsBroken || parseCard(card).suit === 'H';

  // Record in engine (bypasses guard checks — already validated externally)
  (g as any).directPlay([card], 'table');

  const trickCards = [...s.trickCards, { card, seat }];
  const hands = s.hands.map((h, i) =>
    i === seat ? h.filter((c) => c !== card) : h
  );

  const nextSeat = (seat + 1) % 4;
  if (trickCards.length < 4) {
    g.currentRound.currentPlayerIdx = nextSeat;
    g.currentRound.turnIdx += 1;
    g.currentRound.previousPlayerIdx.push(seat);
  }

  return {
    ...s,
    hands,
    trickCards,
    trickLedSuit,
    heartsBroken,
    curSeat: trickCards.length < 4 ? nextSeat : seat,
    engineJson: g.asJSON(),
  };
}

function applyTrickResolution(s: HeartsRoomState): HeartsRoomState {
  const mapped = s.trickCards.map((tc) => ({
    card: tc.card,
    playerIdx: tc.seat,
  }));
  const winnerSeat = trickWinner(mapped, s.trickLedSuit! as import('@/app/games/hearts/engine').Suit);
  const pts = s.trickCards.reduce(
    (sum, tc) => sum + cardPoints(tc.card),
    0
  );
  const handPoints = s.handPoints.map((p, i) =>
    i === winnerSeat ? p + pts : p
  );
  const tricksInHand = s.tricksInHand + 1;

  const g = makeGame(s.engineJson);
  g.currentRound.table = [];
  g.currentRound.currentPlayerIdx = winnerSeat;
  g.currentRound.firstPlayerIdx = winnerSeat;
  g.currentRound.turnIdx += 1;
  g.currentRound.previousPlayerIdx = [];

  return {
    ...s,
    handPoints,
    trickCards: [],
    trickLedSuit: null,
    tricksInHand,
    curSeat: winnerSeat,
    engineJson: g.asJSON(),
    phase: tricksInHand === 13 ? 'hand_end' : 'playing',
  };
}

function applyHandEnd(s: HeartsRoomState): HeartsRoomState {
  let pts = [...s.handPoints];
  const shooter = detectShootTheMoon(pts);
  if (shooter !== null) pts = applyShootTheMoon(pts, shooter);

  const gamePoints = s.gamePoints.map((p, i) => p + pts[i]);

  if (Math.max(...gamePoints) >= 100) {
    const winnerSeat = gamePoints.indexOf(Math.min(...gamePoints));
    return {
      ...s,
      gamePoints,
      handPoints: pts,
      phase: 'game_over',
      winnerSeat,
    };
  }

  // Deal the next hand
  const handNumber = s.handNumber + 1;
  const g = new Game({
    config: (games as any).hearts,
    playerIds: ['0', '1', '2', '3'],
  });
  g.start();
  const engineJson = g.asJSON();
  const hands = [0, 1, 2, 3].map((i) => [
    ...engineJson.rounds[0].players[i].hand,
  ]);
  const passDirection = passDirectionForHand(handNumber);

  return {
    ...s,
    gamePoints,
    handPoints: [0, 0, 0, 0],
    hands,
    handNumber,
    passDirection,
    passSelections: [null, null, null, null],
    heartsBroken: false,
    trickCards: [],
    trickLedSuit: null,
    tricksInHand: 0,
    curSeat: g.currentPlayerIdx,
    engineJson,
    winnerSeat: null,
    phase: passDirection !== 'none' ? 'passing' : 'playing',
  };
}

function applyAllPasses(s: HeartsRoomState): HeartsRoomState {
  const g = makeGame(s.engineJson);
  const passes = s.passSelections.map((p) => p!);
  const newGame = engineApplyPasses(g, passes, s.passDirection as any);
  const engineJson = newGame.asJSON();
  const hands = [0, 1, 2, 3].map((i) => [
    ...engineJson.rounds[0].players[i].hand,
  ]);

  return {
    ...s,
    phase: 'playing',
    hands,
    engineJson,
    passSelections: [null, null, null, null],
    curSeat: newGame.currentPlayerIdx,
  };
}

// ── Main driver ────────────────────────────────────────────────────────────────

/**
 * Advance the state until a human input is required (or the game ends).
 * Handles: bot passes, bot plays, trick resolution, hand scoring, re-dealing.
 */
export function advance(state: HeartsRoomState): HeartsRoomState {
  let s = state;

  for (let guard = 0; guard < 300; guard++) {
    // ── Pass phase: fill bot selections and apply when all done ──
    if (s.phase === 'passing') {
      const sel = [...s.passSelections] as (string[] | null)[];
      let changed = false;
      for (let seat = 0; seat < 4; seat++) {
        if (s.isBot[seat] && sel[seat] === null) {
          sel[seat] = chooseBotPass(s.hands[seat], s.passDirection as any);
          changed = true;
        }
      }
      if (changed) s = { ...s, passSelections: sel };
      if (sel.every((p) => p !== null)) {
        s = applyAllPasses(s);
        continue;
      }
      break; // waiting for a human to submit their pass
    }

    // ── Hand end: score + re-deal ──
    if (s.phase === 'hand_end') {
      s = applyHandEnd(s);
      continue;
    }

    if (s.phase !== 'playing') break; // game_over or waiting

    // ── Completed trick ──
    if (s.trickCards.length === 4) {
      s = applyTrickResolution(s);
      continue;
    }

    // ── Bot play ──
    if (s.isBot[s.curSeat]) {
      const g = makeGame(s.engineJson);
      const mapped = s.trickCards.map((tc) => ({
        card: tc.card,
        playerIdx: tc.seat,
      }));
      const card = chooseBotPlay(g, s.curSeat, mapped, s.trickLedSuit);
      s = applyCardPlay(s, s.curSeat, card);
      continue;
    }

    break; // human turn
  }

  return s;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createWaitingState(
  playerNames: string[],
  isBot: boolean[],
): HeartsRoomState {
  return {
    phase: 'waiting',
    hands: [[], [], [], []],
    gamePoints: [0, 0, 0, 0],
    handPoints: [0, 0, 0, 0],
    heartsBroken: false,
    trickCards: [],
    trickLedSuit: null,
    tricksInHand: 0,
    handNumber: 0,
    curSeat: 0,
    passDirection: 'none',
    passSelections: [null, null, null, null],
    winnerSeat: null,
    playerNames,
    isBot,
    engineJson: null,
  };
}

export function startGame(state: HeartsRoomState): HeartsRoomState {
  const g = new Game({
    config: (games as any).hearts,
    playerIds: ['0', '1', '2', '3'],
  });
  g.start();
  const engineJson = g.asJSON();
  const hands = [0, 1, 2, 3].map((i) => [
    ...engineJson.rounds[0].players[i].hand,
  ]);
  const passDirection = passDirectionForHand(0);

  const s: HeartsRoomState = {
    ...state,
    phase: passDirection !== 'none' ? 'passing' : 'playing',
    hands,
    engineJson,
    handNumber: 0,
    gamePoints: [0, 0, 0, 0],
    handPoints: [0, 0, 0, 0],
    heartsBroken: false,
    trickCards: [],
    trickLedSuit: null,
    tricksInHand: 0,
    passDirection,
    passSelections: [null, null, null, null],
    curSeat: g.currentPlayerIdx,
    winnerSeat: null,
  };

  return advance(s);
}

export function humanPlay(
  state: HeartsRoomState,
  seat: number,
  card: string,
): HeartsRoomState {
  if (state.phase !== 'playing') throw new Error('Not in play phase');
  if (state.curSeat !== seat) throw new Error('Not your turn');
  if (!state.hands[seat].includes(card))
    throw new Error('Card not in hand');

  const g = makeGame(state.engineJson);
  const legal = getLegalPlays(
    g,
    seat,
    state.trickCards,
    state.trickLedSuit,
    state.heartsBroken,
    state.tricksInHand,
  );
  if (!legal.includes(card))
    throw new Error(`Illegal play: ${card}`);

  return advance(applyCardPlay(state, seat, card));
}

export function humanPass(
  state: HeartsRoomState,
  seat: number,
  cards: string[],
): HeartsRoomState {
  if (state.phase !== 'passing') throw new Error('Not in pass phase');
  if (state.passSelections[seat] !== null)
    throw new Error('Already submitted pass');
  if (cards.length !== 3) throw new Error('Must pass exactly 3 cards');
  for (const c of cards) {
    if (!state.hands[seat].includes(c))
      throw new Error(`Card ${c} not in hand`);
  }

  return advance({
    ...state,
    passSelections: state.passSelections.map(
      (p, i) => (i === seat ? cards : p),
    ) as (string[] | null)[],
  });
}
