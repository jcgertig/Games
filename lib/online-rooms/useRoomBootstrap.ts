'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';
import type { RoomStatus, SeatInfo } from './types';

// ── Internal browser client ───────────────────────────────────────────────────

function makeBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseRoomBootstrapResult<TState> {
  roomStatus: RoomStatus;
  mySeat:     number | null;
  seats:      SeatInfo[];
  isOwner:    boolean;
  gameState:  TState | null;
  error:      string;
  /** Stable callback — safe to pass into a Phaser scene factory. */
  sendAction: (type: string, payload?: unknown) => Promise<void>;
  /** Trigger the start API call (owner only). */
  startGame:  () => Promise<void>;
  starting:   boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRoomBootstrap<TState = unknown>(options: {
  code:     string;
  gameSlug: string;
}): UseRoomBootstrapResult<TState> {
  const { code, gameSlug } = options;
  const upperCode = code.toUpperCase();

  const scoresClient = useScoresClient();
  const supabase     = useRef(makeBrowserClient());

  const [roomStatus, setRoomStatus] = useState<RoomStatus>('loading');
  const [mySeat,     setMySeat]     = useState<number | null>(null);
  const [seats,      setSeats]      = useState<SeatInfo[]>([]);
  const [isOwner,    setIsOwner]    = useState(false);
  const [error,      setError]      = useState('');
  const [gameState,  setGameState]  = useState<TState | null>(null);
  const [starting,   setStarting]   = useState(false);

  // ── Token acquisition ───────────────────────────────────────────────────────
  // Stable ref keeps the token getter out of sendAction's dep array so the
  // callback identity stays constant across renders.
  const getTokenRef = useRef<() => Promise<string | null>>(async () => null);
  getTokenRef.current = async () => {
    const { data: { session } } = await supabase.current.auth.getSession();
    if (session) return session.access_token;
    const sc = scoresClient.getSupabaseClient();
    const { data: { session: s2 } } = await sc.auth.refreshSession();
    return s2?.access_token ?? null;
  };

  // ── sendAction — stable identity across renders ────────────────────────────
  const sendAction = useCallback(async (type: string, payload: unknown = {}) => {
    const token = await getTokenRef.current();
    if (!token) return;
    await fetch(`/api/online/rooms/${upperCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, payload }),
    });
  }, [upperCode]); // upperCode is derived from the stable `code` prop

  // ── startGame ──────────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    const token = await getTokenRef.current();
    if (!token) return;
    setStarting(true);
    const res  = await fetch(`/api/online/rooms/${upperCode}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? 'Failed to start');
    setStarting(false);
  }, [upperCode]);

  // ── Bootstrap effect ───────────────────────────────────────────────────────
  useEffect(() => {
    let stateChannel: ReturnType<ReturnType<typeof makeBrowserClient>['channel']> | undefined;
    let roomChannel:  ReturnType<ReturnType<typeof makeBrowserClient>['channel']> | undefined;
    let cancelled = false;

    (async () => {
      const token = await getTokenRef.current();

      // Join the room (idempotent — returns existing seat if already seated)
      if (!token) {
        if (!cancelled) { setError('Sign in to join a room'); setRoomStatus('error'); }
        return;
      }
      const joinRes  = await fetch(`/api/online/rooms/${upperCode}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const joinJson = await joinRes.json();
      if (cancelled) return;
      if (!joinRes.ok) {
        setError(joinJson.error ?? 'Could not join room');
        setRoomStatus('error');
        return;
      }
      setMySeat(joinJson.yourSeat ?? null);

      // Fetch room + seats + initial state via RLS-restricted direct query
      const { data: room } = await supabase.current
        .from('online_rooms')
        .select('id, status, owner_id, online_seats(*), online_game_state(state)')
        .eq('code', upperCode)
        .eq('game_slug', gameSlug)
        .maybeSingle();

      if (cancelled) return;
      if (!room) { setError('Room not found'); setRoomStatus('error'); return; }

      const rId        = (room as any).id as string;
      const currentUser = (await supabase.current.auth.getUser()).data.user;
      setIsOwner((room as any).owner_id === currentUser?.id);
      setSeats(((room as any).online_seats ?? []) as SeatInfo[]);
      setRoomStatus((room as any).status as RoomStatus);

      const initialState = (room as any).online_game_state?.[0]?.state ?? null;
      if (initialState) setGameState(initialState as TState);

      // ── Realtime: game state updates (card plays, passes, etc.) ─────────────
      stateChannel = supabase.current
        .channel(`online-state:${rId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', schema: 'public',
            table: 'online_game_state',
            filter: `room_id=eq.${rId}`,
          },
          (payload: any) => {
            if (cancelled) return;
            setGameState(payload.new.state as TState);
          },
        )
        .subscribe();

      // ── Realtime: room status changes (waiting → playing → done) ────────────
      roomChannel = supabase.current
        .channel(`online-room:${rId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', schema: 'public',
            table: 'online_rooms',
            filter: `id=eq.${rId}`,
          },
          (payload: any) => {
            if (cancelled) return;
            setRoomStatus(payload.new.status as RoomStatus);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      stateChannel?.unsubscribe();
      roomChannel?.unsubscribe();
    };
  }, [upperCode, gameSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  return { roomStatus, mySeat, seats, isOwner, gameState, error, sendAction, startGame, starting };
}
