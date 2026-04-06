'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';

interface Props {
  /** Slug used when creating a room, e.g. 'hearts' */
  gameSlug:     string;
  /** URL prefix for room pages, e.g. '/games/hearts/room' */
  roomBasePath: string;
  backHref:     string;
  backLabel?:   string;
  title?:       string;
  subtitle?:    string;
  icon?:        string;
  /** Optional link to the active-rooms page */
  onlinePath?:  string;
}

/**
 * Generic create/join lobby page.
 * Calls POST /api/online/rooms with { gameSlug } to create rooms.
 */
export function LobbyPage({
  gameSlug,
  roomBasePath,
  backHref,
  backLabel  = 'Play offline instead',
  title      = 'Play Online',
  subtitle   = 'Play with friends — bots fill empty seats',
  icon       = '🃏',
  onlinePath,
}: Props) {
  const router = useRouter();
  const client = useScoresClient();

  const [joinCode, setJoinCode] = useState('');
  const [loading,  setLoading]  = useState<'create' | 'join' | null>(null);
  const [error,    setError]    = useState('');

  async function getToken(): Promise<string> {
    const supabase = client.getSupabaseClient();
    const { data: { session } } = await supabase.auth.refreshSession();
    if (!session) throw new Error('Not signed in');
    return session.access_token;
  }

  async function createRoom() {
    setError('');
    setLoading('create');
    try {
      const token = await getToken();
      const res   = await fetch('/api/online/rooms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ gameSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create room');
      router.push(`${roomBasePath}/${json.code}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) { setError('Enter a 4-letter room code'); return; }
    setError('');
    setLoading('join');
    try {
      const token = await getToken();
      const res   = await fetch(`/api/online/rooms/${code}/join`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to join room');
      router.push(`${roomBasePath}/${code}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-2">{icon}</div>
        <h1 className="text-4xl font-bold text-red-400 font-serif">{title}</h1>
        <p className="text-slate-400 mt-2">{subtitle}</p>
      </div>

      {/* Action cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
        {/* Create */}
        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Create a Room</h2>
          <p className="text-slate-400 text-sm">Get a shareable code and invite friends.</p>
          <button
            onClick={createRoom}
            disabled={loading !== null}
            className="mt-auto bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading === 'create' ? 'Creating…' : 'Create Room'}
          </button>
        </div>

        {/* Join */}
        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Join a Room</h2>
          <p className="text-slate-400 text-sm">Enter the 4-letter code your friend shared.</p>
          <input
            className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-xl tracking-widest uppercase outline-none focus:border-green-500"
            placeholder="ABCD"
            maxLength={4}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
          />
          <button
            onClick={joinRoom}
            disabled={loading !== null}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading === 'join' ? 'Joining…' : 'Join Room'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 bg-red-950/50 border border-red-800 rounded-xl px-4 py-2 text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-6 text-sm text-slate-500">
        {onlinePath && (
          <Link href={onlinePath} className="hover:text-slate-300 transition-colors">
            My active rooms →
          </Link>
        )}
        <Link href={backHref} className="hover:text-slate-300 transition-colors">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
