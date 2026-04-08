'use client';

import type { SeatInfo } from '../types';

interface Props {
  code:     string;
  seats:    SeatInfo[];
  mySeat:   number | null;
  maxSeats: number;
  isOwner:  boolean;
  starting: boolean;
  onStart:  () => void;
  onClose?: () => void;
  onLeave?: () => void;
  error:    string;
  icon?:    string;
  title?:   string;
  backPath: string;
  onBack?:  () => void;
}

/**
 * Pure waiting-room UI — seat list + start/close/leave buttons.
 * No API calls or effects; all data flows in via props from useRoomBootstrap.
 */
export function RoomLobby({
  code, seats, mySeat, maxSeats, isOwner, starting, onStart,
  onClose, onLeave, error, icon = '🃏', title, backPath, onBack,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-2">{icon}</div>
        <h1 className="text-3xl font-bold text-red-400 font-serif">
          {title ? `${title} — ` : ''}Room {code.toUpperCase()}
        </h1>
        <p className="text-slate-400 mt-1">Share this code with friends to join</p>
      </div>

      {/* Seat list */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        {Array.from({ length: maxSeats }, (_, s) => {
          const seat = seats.find(x => x.seat === s);
          const isMe = s === mySeat;
          return (
            <div key={s} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
              isMe ? 'bg-green-900/40 border-green-600' : 'bg-slate-800 border-slate-700'
            }`}>
              <span className="text-slate-500 w-6">#{s}</span>
              {seat ? (
                <>
                  <span className="text-white font-medium flex-1">{seat.display_name}</span>
                  {seat.is_bot
                    ? <span className="text-xs text-slate-500">Bot</span>
                    : <span className="text-xs text-green-400">Ready</span>
                  }
                  {isMe && <span className="text-xs text-green-400 font-bold ml-1">YOU</span>}
                </>
              ) : (
                <span className="text-slate-500 italic flex-1">Empty</span>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-3">
        {isOwner ? (
          <>
            <button
              onClick={onStart}
              disabled={starting}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
            >
              {starting ? 'Starting…' : 'Start Game'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-300 text-sm transition-colors border border-red-800 hover:border-red-600 px-4 py-2 rounded-lg"
              >
                Close Room
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm animate-pulse">Waiting for host to start…</p>
            {onLeave && (
              <button
                onClick={onLeave}
                className="text-slate-400 hover:text-slate-200 text-sm transition-colors border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-lg"
              >
                Leave Room
              </button>
            )}
          </>
        )}
      </div>

      {onBack ? (
        <button onClick={onBack} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Back
        </button>
      ) : (
        <a href={backPath} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Back
        </a>
      )}
    </div>
  );
}
