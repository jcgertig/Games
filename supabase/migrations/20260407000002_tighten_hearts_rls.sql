-- ── Tighten Hearts RLS: players only see rooms they belong to ────────────────
--
-- Replace the original "public read" SELECT policies with member-only policies.
-- Writes still go exclusively through service-role API routes (RLS bypassed).
--
-- We use a SECURITY DEFINER helper to look up the caller's room memberships
-- without triggering a self-referential policy loop on hearts_seats.

-- ── Helper function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_hearts_room_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT room_id), ARRAY[]::UUID[])
  FROM public.hearts_seats
  WHERE user_id = auth.uid();
$$;

-- ── Drop old permissive read policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "hearts_rooms_select"  ON public.hearts_rooms;
DROP POLICY IF EXISTS "hearts_seats_select"  ON public.hearts_seats;
DROP POLICY IF EXISTS "hearts_state_select"  ON public.hearts_game_state;

-- Also clean up the redundant service_role check on updates (service role
-- bypasses RLS entirely; the check was harmless but misleading).
DROP POLICY IF EXISTS "hearts_rooms_update"  ON public.hearts_rooms;
DROP POLICY IF EXISTS "hearts_seats_write"   ON public.hearts_seats;
DROP POLICY IF EXISTS "hearts_state_write"   ON public.hearts_game_state;

-- ── Restricted read policies ──────────────────────────────────────────────────

-- Rooms: visible only to the owner or to players who hold a seat.
CREATE POLICY "hearts_rooms_select" ON public.hearts_rooms
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id = ANY(public.user_hearts_room_ids())
  );

-- Seats: visible only within rooms you participate in.
-- (Allows seeing all 4 seats — bots + humans — for the lobby UI.)
CREATE POLICY "hearts_seats_select" ON public.hearts_seats
  FOR SELECT USING (
    room_id = ANY(public.user_hearts_room_ids())
  );

-- Game state: visible only to room participants.
CREATE POLICY "hearts_state_select" ON public.hearts_game_state
  FOR SELECT USING (
    room_id = ANY(public.user_hearts_room_ids())
  );

-- ── Write policies (block browser clients; service role bypasses entirely) ────

-- Rooms: only the owner may update directly (e.g. future client-side actions).
-- Service role (API routes) bypasses this automatically.
CREATE POLICY "hearts_rooms_update" ON public.hearts_rooms
  FOR UPDATE USING (owner_id = auth.uid());

-- Seats: all writes must come through API routes (service role).
-- This policy makes authenticated/anon browser writes impossible.
CREATE POLICY "hearts_seats_write" ON public.hearts_seats
  FOR ALL USING (false);

-- Game state: same — API routes only.
CREATE POLICY "hearts_state_write" ON public.hearts_game_state
  FOR ALL USING (false);
