import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHumanPlay, mockHumanPass, mockAdvance, mockStartGame } = vi.hoisted(() => ({
  mockHumanPlay: vi.fn(),
  mockHumanPass: vi.fn(),
  mockAdvance:   vi.fn(),
  mockStartGame: vi.fn(),
}));

vi.mock('@/app/api/hearts/_game', () => ({
  createWaitingState: vi.fn((names: string[], isBot: boolean[]) => ({ phase: 'waiting', playerNames: names, isBot })),
  startGame:          mockStartGame,
  humanPlay:          mockHumanPlay,
  humanPass:          mockHumanPass,
  advance:            mockAdvance,
}));

import { heartsConfig } from '@/app/api/online/_games/hearts';

const BASE_STATE = {
  phase: 'playing',
  playerNames: ['Alice', 'West Bot', 'North Bot', 'East Bot'],
  isBot: [false, true, true, true],
  curSeat: 0,
};

describe('heartsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHumanPlay.mockReturnValue({ ...BASE_STATE, phase: 'playing' });
    mockHumanPass.mockReturnValue({ ...BASE_STATE, phase: 'passing' });
    mockAdvance.mockImplementation((s: any) => s);
    mockStartGame.mockReturnValue({ ...BASE_STATE, phase: 'passing' });
  });

  it('has correct metadata', () => {
    expect(heartsConfig.gameSlug).toBe('hearts');
    expect(heartsConfig.maxSeats).toBe(4);
    expect(heartsConfig.defaultBotNames).toHaveLength(3);
  });

  describe('applyAction', () => {
    it('dispatches play action', () => {
      heartsConfig.applyAction(BASE_STATE, 0, { type: 'play', payload: { card: 'AS' } });
      expect(mockHumanPlay).toHaveBeenCalledWith(BASE_STATE, 0, 'AS');
    });

    it('dispatches pass action', () => {
      heartsConfig.applyAction(BASE_STATE, 0, { type: 'pass', payload: { cards: ['AS', '2S', '3S'] } });
      expect(mockHumanPass).toHaveBeenCalledWith(BASE_STATE, 0, ['AS', '2S', '3S']);
    });

    it('throws for unknown action type', () => {
      expect(() =>
        heartsConfig.applyAction(BASE_STATE, 0, { type: 'unknown', payload: {} })
      ).toThrow('Unknown Hearts action');
    });
  });

  describe('isGameOver', () => {
    it('returns true when phase is game_over', () => {
      expect(heartsConfig.isGameOver({ ...BASE_STATE, phase: 'game_over' })).toBe(true);
    });

    it('returns false for other phases', () => {
      expect(heartsConfig.isGameOver(BASE_STATE)).toBe(false);
      expect(heartsConfig.isGameOver({ ...BASE_STATE, phase: 'passing' })).toBe(false);
    });
  });

  describe('patchPlayerName', () => {
    it('updates name and marks as human', () => {
      const result = heartsConfig.patchPlayerName(BASE_STATE, 1, 'Bob');
      expect(result.playerNames[1]).toBe('Bob');
      expect(result.isBot[1]).toBe(false);
      // Other seats unchanged
      expect(result.playerNames[0]).toBe('Alice');
      expect(result.isBot[0]).toBe(false);
    });
  });

  describe('replaceWithBot', () => {
    it('updates name, marks as bot, and calls advance', () => {
      heartsConfig.replaceWithBot(BASE_STATE, 0, 'South Bot');
      expect(mockAdvance).toHaveBeenCalled();
      const callArg = mockAdvance.mock.calls[0][0];
      expect(callArg.playerNames[0]).toBe('South Bot');
      expect(callArg.isBot[0]).toBe(true);
    });
  });

  describe('restoreHuman', () => {
    it('updates name and marks as human without calling advance', () => {
      const result = heartsConfig.restoreHuman(BASE_STATE, 1, 'Carol');
      expect(mockAdvance).not.toHaveBeenCalled();
      expect(result.playerNames[1]).toBe('Carol');
      expect(result.isBot[1]).toBe(false);
    });
  });
});
