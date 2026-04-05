"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useSubmitScore } from "@/lib/scores/hooks/useSubmitScore";
import { useScoresClient } from "@/lib/scores/components/AuthModalProvider";

type Player = "X" | "O";
type Cell = Player | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWinner(board: Board): { winner: Player; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line };
    }
  }
  return null;
}

function isDraw(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export default function TicTacToePage() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [nextStarter, setNextStarter] = useState<Player>("O");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const { submit } = useSubmitScore();
  const client = useScoresClient();

  const result = checkWinner(board);
  const draw = !result && isDraw(board);
  const winningCells = new Set(result?.line ?? []);

  const handleClick = useCallback(
    (index: number) => {
      if (board[index] || result || draw) return;
      const next = [...board];
      next[index] = currentPlayer;
      setBoard(next);

      const newResult = checkWinner(next);
      if (newResult) {
        setScores((s) => ({ ...s, [newResult.winner]: s[newResult.winner] + 1 }));
        // Submit win to leaderboard (auth modal fires if not logged in)
        submit({
          gameSlug:     "tic-tac-toe",
          ladderSlug:   "global",
          primaryValue: 1,
          metadata:     { playedAs: newResult.winner, opponentType: "local" },
        });
        // Update play stats regardless of auth
        client.updatePlayerStats("tic-tac-toe", { plays: 1, wins: 1 });
      } else if (isDraw(next)) {
        client.updatePlayerStats("tic-tac-toe", { plays: 1 });
        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      } else {
        setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
      }
    },
    [board, currentPlayer, result, draw]
  );

  const reset = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer(nextStarter);
    setNextStarter(nextStarter === "X" ? "O" : "X");
  };

  const cellStyle = (index: number) => {
    const base =
      "w-full aspect-square flex items-center justify-center text-4xl font-bold rounded-xl border transition-all cursor-pointer select-none";
    if (winningCells.has(index)) {
      return `${base} bg-indigo-600 border-indigo-400 scale-105`;
    }
    if (board[index]) {
      return `${base} bg-slate-800 border-slate-600 cursor-default`;
    }
    return `${base} bg-slate-900 border-slate-700 hover:bg-slate-800 hover:border-slate-500`;
  };

  const playerColor = (p: Player) =>
    p === "X" ? "text-indigo-400" : "text-rose-400";

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm mb-8 inline-block transition-colors">
        ← Back to games
      </Link>

      <h1 className="text-3xl font-bold text-white mb-1">Tic Tac Toe</h1>
      <p className="text-slate-400 text-sm mb-8">Two players — take turns, get three in a row.</p>

      {/* Scoreboard */}
      <div className="flex gap-4 mb-8">
        {(["X", "O"] as Player[]).map((p) => (
          <div
            key={p}
            className={`flex-1 bg-slate-900 border rounded-xl p-4 text-center transition-all ${
              currentPlayer === p && !result && !draw
                ? "border-indigo-500"
                : "border-slate-800"
            }`}
          >
            <div className={`text-2xl font-bold ${playerColor(p)}`}>{p}</div>
            <div className="text-slate-400 text-sm mt-1">Score</div>
            <div className="text-white text-xl font-semibold">{scores[p]}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="text-center mb-6 h-8">
        {result ? (
          <p className="text-lg font-semibold">
            <span className={playerColor(result.winner)}>{result.winner}</span>
            <span className="text-white"> wins! 🎉</span>
          </p>
        ) : draw ? (
          <p className="text-lg font-semibold text-slate-300">It&apos;s a draw!</p>
        ) : (
          <p className="text-slate-400 text-sm">
            <span className={`font-bold ${playerColor(currentPlayer)}`}>{currentPlayer}&apos;s</span> turn
          </p>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {board.map((cell, i) => (
          <button key={i} className={cellStyle(i)} onClick={() => handleClick(i)}>
            {cell && (
              <span className={cell === "X" ? "text-indigo-400" : "text-rose-400"}>
                {cell}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={reset}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        New Game
      </button>
    </div>
  );
}
