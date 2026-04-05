// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachIframeBridge } from '@/lib/scores/internal/iframe-bridge';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildClientMock() {
  return {
    submitScore:     vi.fn().mockResolvedValue({ saved: true, isImprovement: true, rank: 1 }),
    updatePlayerStats: vi.fn().mockResolvedValue(undefined),
    getPlayerStats:  vi.fn().mockResolvedValue({ plays: 5, wins: 3, losses: 2, totalScore: 1000, extra: {} }),
  };
}

/** Simulate a postMessage from the same origin */
function sendMessage(data: unknown, origin = window.location.origin) {
  const event = new MessageEvent('message', { data, origin });
  window.dispatchEvent(event);
  return event;
}

function makeFakeIframeRef(postMessageMock = vi.fn()) {
  return {
    current: {
      contentWindow: { postMessage: postMessageMock },
    },
  } as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('attachIframeBridge', () => {
  let clientMock: ReturnType<typeof buildClientMock>;

  beforeEach(() => {
    clientMock = buildClientMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Return value ──────────────────────────────────────────────────────────

  it('returns a cleanup function', () => {
    const iframeRef = makeFakeIframeRef();
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('cleanup removes the message listener', async () => {
    const postMessageMock = vi.fn();
    const iframeRef = makeFakeIframeRef(postMessageMock);
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    cleanup();

    sendMessage({ type: 'SCORES_SUBMIT', payload: { gameSlug: 'x', ladderSlug: 'y', primaryValue: 1 } });
    // Give async handler a tick
    await Promise.resolve();

    expect(clientMock.submitScore).not.toHaveBeenCalled();
  });

  // ── Origin filtering ──────────────────────────────────────────────────────

  it('ignores messages from a different origin', async () => {
    const iframeRef = makeFakeIframeRef();
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    const event = new MessageEvent('message', {
      data: { type: 'SCORES_SUBMIT', payload: { gameSlug: 'x', ladderSlug: 'y', primaryValue: 1 } },
      origin: 'https://evil.example.com',
    });
    window.dispatchEvent(event);
    await Promise.resolve();

    expect(clientMock.submitScore).not.toHaveBeenCalled();
    cleanup();
  });

  it('ignores messages that do not have a SCORES_ prefix', async () => {
    const iframeRef = makeFakeIframeRef();
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SOME_OTHER_MESSAGE', payload: {} });
    await Promise.resolve();

    expect(clientMock.submitScore).not.toHaveBeenCalled();
    expect(clientMock.updatePlayerStats).not.toHaveBeenCalled();
    cleanup();
  });

  it('ignores null/undefined messages', async () => {
    const iframeRef = makeFakeIframeRef();
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage(null);
    sendMessage(undefined);
    sendMessage('plain string');
    await Promise.resolve();

    expect(clientMock.submitScore).not.toHaveBeenCalled();
    cleanup();
  });

  // ── SCORES_SUBMIT ─────────────────────────────────────────────────────────

  it('calls client.submitScore with the message payload', async () => {
    const postMessageMock = vi.fn();
    const iframeRef = makeFakeIframeRef(postMessageMock);
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    const payload = { gameSlug: 'tic-tac-toe', ladderSlug: 'global', primaryValue: 5 };
    sendMessage({ type: 'SCORES_SUBMIT', payload });
    await new Promise((r) => setTimeout(r, 0));

    expect(clientMock.submitScore).toHaveBeenCalledWith(payload);
    cleanup();
  });

  it('posts SCORES_SUBMIT_RESULT back to iframe on success', async () => {
    const postMessageMock = vi.fn();
    const iframeRef = makeFakeIframeRef(postMessageMock);
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_SUBMIT', payload: { gameSlug: 'x', ladderSlug: 'y', primaryValue: 1 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(postMessageMock).toHaveBeenCalledWith(
      { type: 'SCORES_SUBMIT_RESULT', payload: { saved: true, isImprovement: true, rank: 1 } },
      window.location.origin
    );
    cleanup();
  });

  it('posts a failed SCORES_SUBMIT_RESULT when submitScore throws', async () => {
    clientMock.submitScore.mockRejectedValue(new Error('network error'));
    const postMessageMock = vi.fn();
    const iframeRef = makeFakeIframeRef(postMessageMock);
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_SUBMIT', payload: { gameSlug: 'x', ladderSlug: 'y', primaryValue: 1 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(postMessageMock).toHaveBeenCalledWith(
      { type: 'SCORES_SUBMIT_RESULT', payload: { saved: false, isImprovement: false, rank: 0 } },
      window.location.origin
    );
    cleanup();
  });

  // ── SCORES_UPDATE_STATS ───────────────────────────────────────────────────

  it('calls client.updatePlayerStats with gameSlug and delta', async () => {
    const iframeRef = makeFakeIframeRef();
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_UPDATE_STATS', payload: { gameSlug: 'dancing-crab', delta: { plays: 1, wins: 1 } } });
    await new Promise((r) => setTimeout(r, 0));

    expect(clientMock.updatePlayerStats).toHaveBeenCalledWith('dancing-crab', { plays: 1, wins: 1 });
    cleanup();
  });

  it('does not crash when updatePlayerStats throws', async () => {
    clientMock.updatePlayerStats.mockRejectedValue(new Error('oops'));
    const iframeRef = makeFakeIframeRef();
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_UPDATE_STATS', payload: { gameSlug: 'x', delta: { plays: 1 } } });
    await new Promise((r) => setTimeout(r, 0));
    // Should not throw — just console.error
    cleanup();
  });

  // ── SCORES_GET_PLAYER_STATS ───────────────────────────────────────────────

  it('calls client.getPlayerStats and posts result back', async () => {
    const postMessageMock = vi.fn();
    const iframeRef = makeFakeIframeRef(postMessageMock);
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_GET_PLAYER_STATS', payload: { gameSlug: 'dancing-crab', requestId: 'req-1' } });
    await new Promise((r) => setTimeout(r, 0));

    expect(clientMock.getPlayerStats).toHaveBeenCalledWith('dancing-crab');
    expect(postMessageMock).toHaveBeenCalledWith(
      {
        type: 'SCORES_PLAYER_STATS_RESULT',
        payload: {
          requestId: 'req-1',
          stats: { plays: 5, wins: 3, losses: 2, totalScore: 1000, extra: {} },
        },
      },
      window.location.origin
    );
    cleanup();
  });

  it('posts null stats when getPlayerStats throws', async () => {
    clientMock.getPlayerStats.mockRejectedValue(new Error('not found'));
    const postMessageMock = vi.fn();
    const iframeRef = makeFakeIframeRef(postMessageMock);
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_GET_PLAYER_STATS', payload: { gameSlug: 'x', requestId: 'req-2' } });
    await new Promise((r) => setTimeout(r, 0));

    expect(postMessageMock).toHaveBeenCalledWith(
      { type: 'SCORES_PLAYER_STATS_RESULT', payload: { requestId: 'req-2', stats: null } },
      window.location.origin
    );
    cleanup();
  });

  // ── iframeRef.current is null ─────────────────────────────────────────────

  it('does not throw when iframeRef.current is null', async () => {
    const iframeRef = { current: null } as never;
    const cleanup = attachIframeBridge(iframeRef, clientMock as never);

    sendMessage({ type: 'SCORES_SUBMIT', payload: { gameSlug: 'x', ladderSlug: 'y', primaryValue: 1 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(clientMock.submitScore).toHaveBeenCalled();
    cleanup();
  });
});
