-- ── Tighten online rooms RLS: players only see rooms they belong to ───────────
--
-- Replace the "public read" SELECT policies with member-only policies.
-- Writes continue to flow exclusively through service-role API routes
-- (service role bypasses RLS entirely).
--
-- A SECURITY DEFINER helper is used to look up the caller's room memberships
-- without triggering a self-referential policy loop on online_seats.

-- ── Helper function ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_online_room_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT room_id), ARRAY[]::UUID[])
  FROM public.online_seats
  WHERE user_id = auth.uid();
$$;

-- ── Drop temporary permissive read policies ───────────────────────────────────

DROP POLICY IF EXISTS "online_rooms_select"  ON public.online_rooms;
DROP POLICY IF EXISTS "online_seats_select"  ON public.online_seats;
DROP POLICY IF EXISTS "online_state_select"  ON public.online_game_state;

-- ── Member-only read policies ─────────────────────────────────────────────────

-- Rooms: visible to the owner or to any player who holds a seat.
CREATE POLICY "online_rooms_select" ON public.online_rooms
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id = ANY(public.user_online_room_ids())
  );

-- Seats: visible within rooms the user participates in.
-- (Allows seeing all seats — bots + humans — for the lobby UI.)
CREATE POLICY "online_seats_select" ON public.online_seats
  FOR SELECT USING (
    room_id = ANY(public.user_online_room_ids())
  );

-- Game state: visible only to room participants.
CREATE POLICY "online_state_select" ON public.online_game_state
  FOR SELECT USING (
    room_id = ANY(public.user_online_room_ids())
  );
