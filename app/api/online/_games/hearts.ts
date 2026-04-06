/**
 * Hearts implementation of OnlineGameConfig.
 *
 * Wraps the functions in app/api/hearts/_game.ts and exposes them through
 * the generic interface so the shared API routes can drive Hearts without
 * any game-specific knowledge.
 */

import type { OnlineGameConfig, PlayerAction } from '@/lib/online-rooms/types';
import {
  type HeartsRoomState,
  createWaitingState,
  startGame,
  humanPlay,
  humanPass,
} from '@/app/api/hearts/_game';

export const heartsConfig: OnlineGameConfig<HeartsRoomState> = {
  gameSlug:        'hearts',
  maxSeats:        4,
  defaultBotNames: ['West Bot', 'North Bot', 'East Bot'],

  createWaitingState,
  startGame,

  applyAction(state: HeartsRoomState, seat: number, action: PlayerAction): HeartsRoomState {
    const p = action.payload as Record<string, unknown>;
    switch (action.type) {
      case 'play': return humanPlay(state, seat, p.card as string);
      case 'pass': return humanPass(state, seat, p.cards as string[]);
      default:     throw new Error(`Unknown Hearts action: "${action.type}"`);
    }
  },

  isGameOver: (state: HeartsRoomState): boolean => state.phase === 'game_over',

  patchPlayerName(state: HeartsRoomState, seat: number, displayName: string): HeartsRoomState {
    const playerNames = [...state.playerNames];
    const isBot       = [...state.isBot];
    playerNames[seat] = displayName;
    isBot[seat]       = false;
    return { ...state, playerNames, isBot };
  },
};
