'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAnonClient } from '@/lib/supabaseClient';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';
import type { SeatInfo } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomRow {
  id:           string;
  code:         string;
  status:       'waiting' | 'playing' | 'done';
  max_seats:    number;
  created_at:   string;
  online_seats: SeatInfo[];
}

const STATUS_LABEL: Record<string, string> = {
  waiting: 'Waiting',
  playing: 'In Progress',
  done:    'Finished',
};

const STATUS_COLOR: Record<string, string> = {
  waiting: 'text-yellow-400',
  playing: 'text-green-400',
  done:    'text-slate-500',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  gameSlug:     string;
  /** Path prefix, e.g. '/games/hearts/room' */
  roomBasePath: string;
  lobbyPath:    string;
  soloPath:     string;
  icon?:        string;
  title?:       string;
}

/**
 * Page that lists all active rooms the signed-in player is a member of.
 * RLS ensures only their own rooms are returned — no filtering needed client-side.
 */
export function ActiveRoomsPage({
  gameSlug,
  roomBasePath,
  lobbyPath,
  soloPath,
  icon  = '🃏',
  title = 'My Active Rooms',
}: Props) {
  const router = useRouter();
  const client = useScoresClient();

  const [rooms,   setRooms]   = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Refresh session so the browser client's RLS query includes the JWT
      const sc = client.getSupabaseClient();
      const { data: { session } } = await sc.auth.refreshSession();
      if (!session) {
        if (!cancelled) { setError('Sign in to see your rooms'); setLoading(false); }
        return;
      }

      const sb = getAnonClient();
      const { data, error: sbErr } = await sb
        .from('online_rooms')
        .select('id, code, status, max_seats, created_at, online_seats(*)')
        .eq('game_slug', gameSlug)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (sbErr) { setError(sbErr.message); setLoading(false); return; }
      setRooms((data as RoomRow[]) ?? []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [client, gameSlug]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 gap-8">
      {/* Header */}
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{icon}</span>
          <h1 className="text-3xl font-bold text-red-400 font-serif">{title}</h1>
        </div>
        <p className="text-slate-400 text-sm">Rooms you&apos;re currently playing in. Click to rejoin.</p>
      </div>

      {/* Room list */}
      <div className="w-full max-w-xl flex flex-col gap-3">
        {loading && (
          <div className="text-slate-400 animate-pulse text-center py-12">Loading rooms…</div>
        )}

        {!loading && error && (
          <div className="text-red-400 bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <div className="text-slate-500 text-center py-12 flex flex-col gap-2">
            <span className="text-4xl">🃏</span>
            <span>No active rooms — create or join one below.</span>
          </div>
        )}

        {rooms.map(room => {
          const humans = room.online_seats.filter(s => !s.is_bot).length;
          const bots   = room.online_seats.length - humans;

          return (
            <button
              key={room.id}
              onClick={() => router.push(`${roomBasePath}/${room.code}`)}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500
                         rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors text-left"
            >
              {/* Code badge */}
              <div className="bg-slate-900 rounded-xl px-4 py-2 font-mono text-xl font-bold text-white tracking-widest min-w-[5rem] text-center">
                {room.code}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col gap-0.5">
                <span className={`text-sm font-semibold ${STATUS_COLOR[room.status] ?? 'text-slate-400'}`}>
                  {STATUS_LABEL[room.status] ?? room.status}
                </span>
                <span className="text-xs text-slate-500">
                  {humans} {humans === 1 ? 'human' : 'humans'}
                  {bots > 0 ? `, ${bots} ${bots === 1 ? 'bot' : 'bots'}` : ''}
                </span>
              </div>

              {/* Seat chips */}
              <div className="flex gap-1">
                {Array.from({ length: room.max_seats }, (_, i) => {
                  const seat = room.online_seats.find(s => s.seat === i);
                  return (
                    <div
                      key={i}
                      title={seat?.display_name ?? 'Empty'}
                      className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold
                        ${!seat         ? 'bg-slate-700 text-slate-500'
                        : seat.is_bot   ? 'bg-slate-600 text-slate-400'
                        :                 'bg-green-700 text-white'}`}
                    >
                      {seat ? (seat.is_bot ? '🤖' : (seat.display_name?.[0] ?? '?')) : '·'}
                    </div>
                  );
                })}
              </div>

              <span className="text-slate-500 text-sm">→</span>
            </button>
          );
        })}
      </div>

      {/* Footer links */}
      <div className="flex gap-6 text-sm text-slate-500">
        <Link href={lobbyPath} className="hover:text-slate-300 transition-colors">+ New room</Link>
        <Link href={soloPath}  className="hover:text-slate-300 transition-colors">← Play solo</Link>
      </div>
    </div>
  );
}
