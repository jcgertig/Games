-- Extend user_online_room_ids() to include rooms where the user is a spectator.
--
-- Previously the function only checked online_seats, so users who left their
-- seat to become a spectator (or joined directly as a spectator) received no
-- Realtime Postgres Changes events because RLS blocked them.
--
-- This replaces the function in-place; no policies need to change.

CREATE OR REPLACE FUNCTION public.user_online_room_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT combined.id), ARRAY[]::UUID[])
  FROM (
    -- Seated players
    SELECT s.room_id AS id
    FROM public.online_seats s
    WHERE s.user_id = auth.uid()
    UNION
    -- Spectators stored in the JSONB array on online_rooms
    SELECT r.id
    FROM public.online_rooms r
    WHERE r.spectators @> jsonb_build_array(
      jsonb_build_object('user_id', auth.uid()::text)
    )
  ) AS combined;
$$;
