'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLeaderboard } from '@/lib/scores/hooks/useLeaderboard';
import { getLaddersForGame } from '@/lib/scores/config/ladders';
import type { LadderConfig, LeaderboardEntry } from '@/lib/scores/types';

// ── Static game list (mirrors seed data) ─────────────────────────────────────

const GAMES: { slug: string; name: string; emoji: string }[] = [
  { slug: 'tic-tac-toe',   name: 'Tic Tac Toe',   emoji: '⭕' },
  { slug: 'car-shot',      name: 'Car Shot',       emoji: '🚗' },
  { slug: 'hearts',        name: 'Hearts',         emoji: '♥' },
  { slug: 'dancing-crab',  name: 'Dancing Crab',   emoji: '🦀' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-base">🥇</span>;
  if (rank === 2) return <span className="text-slate-300 font-bold text-base">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold text-base">🥉</span>;
  return <span className="text-slate-500 tabular-nums w-6 text-right text-sm">{rank}</span>;
}

function LeaderboardRow({
  entry,
  ladder,
}: {
  entry: LeaderboardEntry;
  ladder: LadderConfig;
}) {
  const isComposite = ladder.scoreType === 'composite';

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
        entry.isCurrentUser
          ? 'bg-indigo-600/10 border border-indigo-500/40'
          : 'hover:bg-slate-800/50'
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      {/* Player */}
      <div className="flex-1 min-w-0">
        <span
          className={`font-medium truncate block ${
            entry.isCurrentUser ? 'text-indigo-300' : 'text-white'
          }`}
        >
          {entry.displayName}
          {entry.isCurrentUser && (
            <span className="ml-2 text-xs text-indigo-400 font-normal">(you)</span>
          )}
        </span>
        {entry.submittedAt && (
          <span className="text-xs text-slate-600">
            {new Date(entry.submittedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Scores */}
      <div className="flex items-center gap-6 shrink-0 text-right">
        <div>
          <div className="text-white font-semibold tabular-nums">
            {entry.primaryValue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">{ladder.primaryLabel}</div>
        </div>

        {isComposite && ladder.secondaryLabel && (
          <div className="min-w-[4rem]">
            <div className="text-slate-300 font-medium tabular-nums">
              {entry.secondaryValue != null
                ? entry.secondaryValue.toLocaleString()
                : '—'}
            </div>
            <div className="text-xs text-slate-500">{ladder.secondaryLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardPanel({
  gameSlug,
  ladder,
}: {
  gameSlug: string;
  ladder: LadderConfig;
}) {
  const { data, error, isLoading } = useLeaderboard(gameSlug, ladder.ladderSlug, { limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl bg-slate-800/50 animate-pulse"
            style={{ opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 text-center py-12 text-red-400 text-sm">
        Failed to load leaderboard — please try again.
      </div>
    );
  }

  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <div className="mt-6 text-center py-16">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-slate-400 font-medium">No scores yet</p>
        <p className="text-slate-600 text-sm mt-1">Be the first on the board!</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-4 px-4 pb-2 border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
        <div className="w-8 text-center">#</div>
        <div className="flex-1">Player</div>
        <div className="flex items-center gap-6 text-right">
          <div className="min-w-[3rem]">{ladder.primaryLabel}</div>
          {ladder.scoreType === 'composite' && ladder.secondaryLabel && (
            <div className="min-w-[4rem]">{ladder.secondaryLabel}</div>
          )}
        </div>
      </div>

      {entries.map((entry) => (
        <LeaderboardRow key={entry.userId} entry={entry} ladder={ladder} />
      ))}

      {data && data.total > entries.length && (
        <p className="text-center text-xs text-slate-600 pt-3">
          Showing top {entries.length} of {data.total.toLocaleString()} players
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScoresPage() {
  const [activeGame, setActiveGame] = useState(GAMES[0].slug);
  const [activeLadder, setActiveLadder] = useState<string>('global');

  const ladders = getLaddersForGame(activeGame);
  const selectedLadder =
    ladders.find((l) => l.ladderSlug === activeLadder) ?? ladders[0];

  function handleGameChange(slug: string) {
    setActiveGame(slug);
    setActiveLadder('global');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <Link
        href="/"
        className="text-slate-500 hover:text-slate-300 text-sm mb-8 inline-block transition-colors"
      >
        ← Home
      </Link>

      <h1 className="text-3xl font-bold text-white mb-1">Leaderboards</h1>
      <p className="text-slate-400 mb-8">Top scores across all games. Updated every 30 seconds.</p>

      {/* Game tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {GAMES.map((game) => (
          <button
            key={game.slug}
            onClick={() => handleGameChange(game.slug)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeGame === game.slug
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>{game.emoji}</span>
            {game.name}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {/* Ladder tabs (only shown when a game has multiple ladders) */}
        {ladders.length > 1 && (
          <div className="flex gap-1 flex-wrap mb-4 -mx-1">
            {ladders.map((ladder) => (
              <button
                key={ladder.ladderSlug}
                onClick={() => setActiveLadder(ladder.ladderSlug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeLadder === ladder.ladderSlug
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {ladder.name}
              </button>
            ))}
          </div>
        )}

        {/* Single ladder label (no tabs needed) */}
        {ladders.length === 1 && selectedLadder && (
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-medium text-slate-400">{selectedLadder.name}</h2>
          </div>
        )}

        {selectedLadder && (
          <LeaderboardPanel gameSlug={activeGame} ladder={selectedLadder} />
        )}
      </div>

      {/* Play link */}
      <div className="mt-6 text-center">
        <Link
          href={`/games/${activeGame}`}
          className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Play {GAMES.find((g) => g.slug === activeGame)?.name} →
        </Link>
      </div>
    </div>
  );
}
