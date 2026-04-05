import type { RefObject } from 'react';
import type { ScoresClient } from '../client';
import type { IframeBridgeMessage } from '../types';

/**
 * Attaches a postMessage listener on the parent window that proxies
 * score SDK calls from an iframe game (e.g. Dancing Crab) through to
 * the ScoresClient. The iframe communicates via scores-shim.js.
 *
 * Returns a cleanup function — call it in a useEffect return.
 */
export function attachIframeBridge(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  client: ScoresClient
): () => void {
  const handler = async (event: MessageEvent) => {
    // Only accept messages from our own origin (iframe is same-origin via /public)
    if (event.origin !== window.location.origin) return;

    const msg = event.data as IframeBridgeMessage;
    if (!msg?.type?.startsWith('SCORES_')) return;

    const replyTo = iframeRef.current?.contentWindow;

    if (msg.type === 'SCORES_SUBMIT') {
      try {
        const result = await client.submitScore(msg.payload);
        replyTo?.postMessage(
          { type: 'SCORES_SUBMIT_RESULT', payload: result },
          window.location.origin
        );
      } catch (err) {
        replyTo?.postMessage(
          {
            type: 'SCORES_SUBMIT_RESULT',
            payload: { saved: false, isImprovement: false, rank: 0 },
          },
          window.location.origin
        );
        console.error('[iframe-bridge] SCORES_SUBMIT error:', err);
      }
    }

    if (msg.type === 'SCORES_UPDATE_STATS') {
      try {
        await client.updatePlayerStats(msg.payload.gameSlug, msg.payload.delta);
      } catch (err) {
        console.error('[iframe-bridge] SCORES_UPDATE_STATS error:', err);
      }
    }

    if (msg.type === 'SCORES_GET_PLAYER_STATS') {
      try {
        const stats = await client.getPlayerStats(msg.payload.gameSlug);
        replyTo?.postMessage(
          {
            type: 'SCORES_PLAYER_STATS_RESULT',
            payload: { requestId: msg.payload.requestId, stats },
          },
          window.location.origin
        );
      } catch (err) {
        replyTo?.postMessage(
          {
            type: 'SCORES_PLAYER_STATS_RESULT',
            payload: { requestId: msg.payload.requestId, stats: null },
          },
          window.location.origin
        );
        console.error('[iframe-bridge] SCORES_GET_PLAYER_STATS error:', err);
      }
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
