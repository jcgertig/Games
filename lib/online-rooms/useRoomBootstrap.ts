'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getAnonClient } from '@/lib/supabaseClient';
import { useScoresClient } from '@/lib/scores/components/AuthModalProvider';
import type { RoomStatus, SeatInfo, SpectatorInfo } from './types';

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseRoomBootstrapResult<TState> {
  roomStatus:   RoomStatus;
  mySeat:       number | null;
  seats:        SeatInfo[];
  spectators:   SpectatorInfo[];
  isOwner:      boolean;
  isSpectator:  boolean;
  gameState:    TState | null;
  error:        string;
  /** Stable callback — safe to pass into a Phaser scene factory. */
  sendAction:   (type: string, payload?: unknown) => Promise<void>;
  /** Trigger the start API call (owner only). */
  startGame:    () => Promise<void>;
  starting:     boolean;
  /** Owner only — delete the room and broadcast to all clients. */
  closeRoom:    () => Promise<void>;
  /**
   * Non-owner only — leave the room.
   * spectate=true: seat → bot but stay as standby viewer.
   * spectate=false (default): leave entirely; caller should redirect.
   */
  leaveRoom:    (opts?: { spectate?: boolean }) => Promise<void>;
  /** Spectator only — claim an open bot seat. Reloads the page on success. */
  claimSeat:    () => Promise<'ok' | 'taken'>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRoomBootstrap<TState = unknown>(options: {
  code:     string;
  gameSlug: string;
}): UseRoomBootstrapResult<TState> {
  const { code, gameSlug } = options;
  const upperCode = code.toUpperCase();

  const scoresClient = useScoresClient();
  const supabase     = useRef(getAnonClient());

  const [roomStatus,   setRoomStatus]   = useState<RoomStatus>('loading');
  const [mySeat,       setMySeat]       = useState<number | null>(null);
  const [seats,        setSeats]        = useState<SeatInfo[]>([]);
  const [spectators,   setSpectators]   = useState<SpectatorInfo[]>([]);
  const [isOwner,      setIsOwner]      = useState(false);
  const [isSpectator,  setIsSpectator]  = useState(false);
  const [error,        setError]        = useState('');
  const [gameState,    setGameState]    = useState<TState | null>(null);
  const [starting,     setStarting]     = useState(false);

  // ── Token acquisition ───────────────────────────────────────────────────────
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
  }, [upperCode]);

  // ── startGame ──────────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    const token = await getTokenRef.current();
    if (!token) return;
    setStarting(true);
    const res = await fetch(`/api/online/rooms/${upperCode}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 409) {
        const { data: room } = await supabase.current
          .from('online_rooms')
          .select('id, online_game_state(state)')
          .eq('code', upperCode)
          .maybeSingle();
        const state = (room as any)?.online_game_state?.state ?? null;
        if (state) setGameState(state as TState);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Failed to start');
      }
    }
    setStarting(false);
  }, [upperCode]);

  // ── closeRoom ──────────────────────────────────────────────────────────────
  const closeRoom = useCallback(async () => {
    const token = await getTokenRef.current();
    if (!token) return;
    await fetch(`/api/online/rooms/${upperCode}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Realtime DELETE event will update roomStatus; no need to set it here
  }, [upperCode]);

  // ── leaveRoom ──────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async (opts?: { spectate?: boolean }) => {
    const token = await getTokenRef.current();
    if (!token) return;
    const res = await fetch(`/api/online/rooms/${upperCode}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ spectate: opts?.spectate ?? false }),
    });
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.isSpectator) {
        setIsSpectator(true);
        setMySeat(null);
      }
    }
  }, [upperCode]);

  // ── claimSeat ──────────────────────────────────────────────────────────────
  const claimSeat = useCallback(async (): Promise<'ok' | 'taken'> => {
    const token = await getTokenRef.current();
    if (!token) return 'taken';
    const res = await fetch(`/api/online/rooms/${upperCode}/claim-seat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (json.error === 'seat_taken') return 'taken';
    if (res.ok && json.yourSeat !== undefined) {
      // Reload the page so Phaser re-initialises with the new seat
      window.location.reload();
      return 'ok';
    }
    return 'taken';
  }, [upperCode]);

  // ── Bootstrap effect ───────────────────────────────────────────────────────
  useEffect(() => {
    let stateChannel: ReturnType<ReturnType<typeof getAnonClient>['channel']> | undefined;
    let roomChannel:  ReturnType<ReturnType<typeof getAnonClient>['channel']> | undefined;
    let seatsChannel: ReturnType<ReturnType<typeof getAnonClient>['channel']> | undefined;
    let cancelled = false;

    (async () => {
      const token = await getTokenRef.current();

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
      setIsSpectator(joinJson.spectator ?? false);

      // Fetch room + seats + initial state
      const { data: room } = await supabase.current
        .from('online_rooms')
        .select('id, status, owner_id, spectators, online_seats(*), online_game_state(state)')
        .eq('code', upperCode)
        .eq('game_slug', gameSlug)
        .maybeSingle();

      if (cancelled) return;
      if (!room) { setError('Room not found'); setRoomStatus('error'); return; }

      const rId = (room as any).id as string;
      const { data: { session: mySession } } = await supabase.current.auth.getSession();
      setIsOwner((room as any).owner_id === mySession?.user?.id);
      setSeats(((room as any).online_seats ?? []) as SeatInfo[]);
      setSpectators(((room as any).spectators ?? []) as SpectatorInfo[]);
      setRoomStatus((room as any).status as RoomStatus);

      const initialState = (room as any).online_game_state?.state ?? null;
      if (initialState) setGameState(initialState as TState);

      // ── Realtime: game state updates ─────────────────────────────────────
      stateChannel = supabase.current
        .channel(`online-state:${rId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'online_game_state', filter: `room_id=eq.${rId}` },
          (payload: any) => {
            if (cancelled) return;
            setGameState(payload.new.state as TState);
          },
        )
        .subscribe();

      // ── Realtime: room status / spectators / DELETE ───────────────────────
      roomChannel = supabase.current
        .channel(`online-room:${rId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'online_rooms', filter: `id=eq.${rId}` },
          async (payload: any) => {
            if (cancelled) return;
            const newStatus = payload.new.status as RoomStatus;
            setRoomStatus(newStatus);
            setSpectators((payload.new.spectators ?? []) as SpectatorInfo[]);

            if (newStatus === 'playing') {
              const { data: gs } = await supabase.current
                .from('online_game_state')
                .select('state')
                .eq('room_id', rId)
                .single();
              if (!cancelled && gs?.state) setGameState(gs.state as TState);
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'online_rooms', filter: `id=eq.${rId}` },
          () => {
            if (cancelled) return;
            setRoomStatus('done');
          },
        )
        .subscribe();

      // ── Realtime: seat changes (joins, leaves, claim-seat) ────────────────
      seatsChannel = supabase.current
        .channel(`online-seats:${rId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'online_seats', filter: `room_id=eq.${rId}` },
          async () => {
            if (cancelled) return;
            const { data: updatedSeats } = await supabase.current
              .from('online_seats')
              .select('seat, display_name, is_bot, user_id')
              .eq('room_id', rId);
            if (!cancelled && updatedSeats) setSeats(updatedSeats as SeatInfo[]);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      stateChannel?.unsubscribe();
      roomChannel?.unsubscribe();
      seatsChannel?.unsubscribe();
    };
  }, [upperCode, gameSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(
    () => ({
      roomStatus, mySeat, seats, spectators, isOwner, isSpectator,
      gameState, error, sendAction, startGame, starting,
      closeRoom, leaveRoom, claimSeat,
    }),
    [
      roomStatus, mySeat, seats, spectators, isOwner, isSpectator,
      gameState, error, sendAction, startGame, starting,
      closeRoom, leaveRoom, claimSeat,
    ],
  );
}
