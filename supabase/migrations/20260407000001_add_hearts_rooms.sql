-- ── Generic online multiplayer tables ────────────────────────────────────────
--
-- One set of tables serves all games (hearts, deuces, spades, etc.).
-- game_slug identifies which game a room belongs to.
-- Room codes are unique per game (UNIQUE(game_slug, code)), so two different
-- games can independently have a room with code "ABCD".

CREATE TABLE public.online_rooms (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  game_slug  TEXT     NOT NULL,
  code       TEXT     NOT NULL,
  status     TEXT     NOT NULL DEFAULT 'waiting', -- waiting | playing | done
  owner_id   UUID     REFERENCES auth.users(id),
  max_seats  SMALLINT NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_slug, code)
);

-- One row per seat. is_bot=true means the seat is filled by the server AI.
-- seat index range is 0..(max_seats-1); the CHECK is omitted here so the
-- table works for any game without schema changes.
CREATE TABLE public.online_seats (
  room_id      UUID     NOT NULL REFERENCES public.online_rooms(id) ON DELETE CASCADE,
  seat         SMALLINT NOT NULL,
  user_id      UUID     REFERENCES auth.users(id),
  display_name TEXT     NOT NULL DEFAULT 'Player',
  is_bot       BOOLEAN  NOT NULL DEFAULT TRUE,
  PRIMARY KEY (room_id, seat)
);

-- Authoritative game state (one row per room, replaced on every action).
-- Full game state — including engine JSON if needed — is stored here.
-- Clients subscribe to changes via Supabase Realtime.
CREATE TABLE public.online_game_state (
  room_id    UUID  PRIMARY KEY REFERENCES public.online_rooms(id) ON DELETE CASCADE,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON public.online_seats (room_id);
CREATE INDEX ON public.online_seats (user_id);
CREATE INDEX ON public.online_rooms (game_slug, status) WHERE status = 'waiting';

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Broadcast full row diffs so clients receive new state on every update.
ALTER TABLE public.online_game_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_game_state;
-- Also broadcast room status changes (waiting → playing → done).
ALTER TABLE public.online_rooms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_rooms;

-- ── Row-Level Security (initial, permissive — tightened in next migration) ────
ALTER TABLE public.online_rooms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_seats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_game_state ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies — replaced by member-only policies below.
CREATE POLICY "online_rooms_select" ON public.online_rooms
  FOR SELECT USING (true);
CREATE POLICY "online_rooms_insert" ON public.online_rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "online_rooms_update" ON public.online_rooms
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "online_seats_select" ON public.online_seats
  FOR SELECT USING (true);
CREATE POLICY "online_seats_write" ON public.online_seats
  FOR ALL USING (false); -- all writes via service-role API routes

CREATE POLICY "online_state_select" ON public.online_game_state
  FOR SELECT USING (true);
CREATE POLICY "online_state_write" ON public.online_game_state
  FOR ALL USING (false); -- all writes via service-role API routes
