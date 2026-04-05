/**
 * scores-shim.js
 *
 * Drop-in replacement for the Dancing Crab game's IndexedDB high-score calls.
 * Proxies all score operations to the parent Next.js window via postMessage,
 * which routes them through the ScoresClient SDK (lib/scores/internal/iframe-bridge.ts).
 *
 * Usage inside the game:
 *   <script src="/dancing-crab/scores-shim.js"></script>
 *
 * Then replace IndexedDB calls with:
 *   ScoresShim.submitScore({ gameSlug, ladderSlug, primaryValue, secondaryValue?, metadata? })
 *   ScoresShim.updateStats(gameSlug, delta)
 *   ScoresShim.getPlayerStats(gameSlug)
 */

const ScoresShim = (() => {
  const ORIGIN = window.location.origin;

  /**
   * Submit a score. Returns a Promise that resolves to:
   * { saved: boolean, isImprovement: boolean, rank: number }
   */
  function submitScore(options) {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.origin !== ORIGIN) return;
        if (event.data?.type === 'SCORES_SUBMIT_RESULT') {
          window.removeEventListener('message', handler);
          resolve(event.data.payload);
        }
      };
      window.addEventListener('message', handler);
      window.parent.postMessage({ type: 'SCORES_SUBMIT', payload: options }, ORIGIN);
    });
  }

  /**
   * Fire-and-forget stats update.
   * @param {string} gameSlug
   * @param {{ plays?: number, wins?: number, losses?: number, totalScore?: number,
   *            bestScore?: number, bestTime?: number, extra?: object }} delta
   */
  function updateStats(gameSlug, delta) {
    window.parent.postMessage(
      { type: 'SCORES_UPDATE_STATS', payload: { gameSlug, delta } },
      ORIGIN
    );
  }

  /**
   * Fetch the current user's stats for a game.
   * Returns a Promise that resolves to the stats object or null if not logged in.
   */
  function getPlayerStats(gameSlug) {
    return new Promise((resolve) => {
      const requestId = Math.random().toString(36).slice(2);
      const handler = (event) => {
        if (event.origin !== ORIGIN) return;
        if (
          event.data?.type === 'SCORES_PLAYER_STATS_RESULT' &&
          event.data.payload?.requestId === requestId
        ) {
          window.removeEventListener('message', handler);
          resolve(event.data.payload.stats);
        }
      };
      window.addEventListener('message', handler);
      window.parent.postMessage(
        { type: 'SCORES_GET_PLAYER_STATS', payload: { gameSlug, requestId } },
        ORIGIN
      );
    });
  }

  return { submitScore, updateStats, getPlayerStats };
})();

// Make available globally
window.ScoresShim = ScoresShim;
