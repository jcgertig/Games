'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeatRow {
  seat: number;
  display_name: string;
  is_bot: boolean;
  user_id: string | null;
}

interface RoomRow {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'done';
  created_at: string;
  hearts_seats: SeatRow[];
}

// ── Supabase browser client ───────────────────────────────────────────────────

function makeBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function humanCount(seats: SeatRow[]) {
  return seats.filter(s => !s.is_bot).length;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HeartsOnlinePage() {
  const router   = useRouter();
  const client   = useScoresClient();

  const [rooms,   setRooms]   = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Ensure a fresh session so the RLS-restricted query returns data.
      const sc      = client.getSupabaseClient();
      const { data: { session } } = await sc.auth.refreshSession();
      if (!session) {
        if (!cancelled) { setError('Sign in to see your rooms'); setLoading(false); }
        return;
      }

      // Use a browser client (picks up the stored session from localStorage)
      // so that RLS filtering is applied with the user's JWT.
      const sb = makeBrowserClient();
      const { data, error: sbError } = await sb
        .from('hearts_rooms')
        .select('id, code, status, created_at, hearts_seats(*)')
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (sbError) { setError(sbError.message); setLoading(false); return; }

      setRooms((data as RoomRow[]) ?? []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [client]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 gap-8">
      {/* Header */}
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">♥</span>
          <h1 className="text-3xl font-bold text-red-400 font-serif">My Active Rooms</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Rooms you&apos;re currently playing in. Click to rejoin.
        </p>
      </div>

      {/* Content */}
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
          const humans = humanCount(room.hearts_seats);
          const bots   = room.hearts_seats.length - humans;

          return (
            <button
              key={room.id}
              onClick={() => router.push(`/games/hearts/room/${room.code}`)}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500
                         rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors text-left"
            >
              {/* Code badge */}
              <div className="bg-slate-900 rounded-xl px-4 py-2 font-mono text-xl font-bold text-white tracking-widest min-w-[5rem] text-center">
                {room.code}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${STATUS_COLOR[room.status] ?? 'text-slate-400'}`}>
                    {STATUS_LABEL[room.status] ?? room.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {humans} {humans === 1 ? 'human' : 'humans'}{bots > 0 ? `, ${bots} ${bots === 1 ? 'bot' : 'bots'}` : ''}
                </div>
              </div>

              {/* Seat chips */}
              <div className="flex gap-1">
                {[0,1,2,3].map(i => {
                  const seat = room.hearts_seats.find(s => s.seat === i);
                  return (
                    <div
                      key={i}
                      title={seat?.display_name ?? 'Empty'}
                      className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold
                        ${!seat          ? 'bg-slate-700 text-slate-500'
                        : seat.is_bot    ? 'bg-slate-600 text-slate-400'
                        :                  'bg-green-700 text-white'}`}
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
        <Link href="/games/hearts/lobby" className="hover:text-slate-300 transition-colors">
          + New room
        </Link>
        <Link href="/games/hearts" className="hover:text-slate-300 transition-colors">
          ← Play vs bots
        </Link>
      </div>
    </div>
  );
}
