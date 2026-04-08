-- ── online_chat_messages ──────────────────────────────────────────────────────
--
-- Persistent chat for online game rooms.
--
-- Soft-delete:  body = NULL + deleted_at = now() (row kept; UI shows "[message deleted]").
-- Edits:        body updated in-place + edited_at = now().
-- Cascade:      ON DELETE CASCADE from online_rooms — all messages removed when room closes.
-- Rate-limit:   partial index on (room_id, user_id, created_at) for fast COUNT queries.
-- RLS:          SELECT visible to room members only (reuses user_online_room_ids() helper).
--               All writes go through service-role API routes.

CREATE TABLE public.online_chat_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        NOT NULL REFERENCES public.online_rooms(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id),
  display_name TEXT        NOT NULL,
  body         TEXT,                    -- NULL when soft-deleted
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at    TIMESTAMPTZ,             -- NULL until first edit
  deleted_at   TIMESTAMPTZ,             -- NULL until soft-deleted

  CONSTRAINT chat_body_max_length CHECK (char_length(body) <= 500),
  CONSTRAINT chat_body_not_empty  CHECK (
    deleted_at IS NOT NULL
    OR (body IS NOT NULL AND char_length(trim(body)) > 0)
  )
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary query: load last 100 messages for a room (ORDER BY created_at ASC LIMIT 100)
CREATE INDEX online_chat_messages_room_created
  ON public.online_chat_messages (room_id, created_at DESC);

-- Rate-limit query: COUNT per (room_id, user_id) within the last 1 second
CREATE INDEX online_chat_messages_rate_limit
  ON public.online_chat_messages (room_id, user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── Realtime ──────────────────────────────────────────────────────────────────

ALTER TABLE public.online_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_chat_messages;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.online_chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: room members only (seated players + spectators via the existing helper)
CREATE POLICY "chat_select" ON public.online_chat_messages
  FOR SELECT USING (
    room_id = ANY(public.user_online_room_ids())
  );

-- INSERT / UPDATE / DELETE: blocked for anon/authenticated client;
-- all writes go through service-role API routes which bypass RLS.
CREATE POLICY "chat_write" ON public.online_chat_messages
  FOR ALL USING (false);
