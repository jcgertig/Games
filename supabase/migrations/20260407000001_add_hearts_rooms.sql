-- ── Hearts multiplayer tables ─────────────────────────────────────────────────

-- Room with a short 4-char join code
CREATE TABLE public.hearts_rooms (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT    UNIQUE NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'waiting', -- waiting | playing | done
  owner_id   UUID    REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per seat (0-3). is_bot=true means the seat is filled by the server AI.
CREATE TABLE public.hearts_seats (
  room_id      UUID     NOT NULL REFERENCES public.hearts_rooms(id) ON DELETE CASCADE,
  seat         SMALLINT NOT NULL CHECK (seat BETWEEN 0 AND 3),
  user_id      UUID     REFERENCES auth.users(id),
  display_name TEXT     NOT NULL DEFAULT 'Player',
  is_bot       BOOLEAN  NOT NULL DEFAULT TRUE,
  PRIMARY KEY (room_id, seat)
);

-- Authoritative game state (one row per room, replaced on every action).
-- Full state including engine JSON is stored here.
-- Clients subscribe to changes via Supabase Realtime.
CREATE TABLE public.hearts_game_state (
  room_id    UUID  PRIMARY KEY REFERENCES public.hearts_rooms(id) ON DELETE CASCADE,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON public.hearts_seats (room_id);
CREATE INDEX ON public.hearts_seats (user_id);
CREATE INDEX ON public.hearts_rooms (status) WHERE status = 'waiting';

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Broadcast full row diffs so clients receive new state on every update.
ALTER TABLE public.hearts_game_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hearts_game_state;

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.hearts_rooms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hearts_seats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hearts_game_state ENABLE ROW LEVEL SECURITY;

-- Rooms: public read, authenticated create, owner update
CREATE POLICY "hearts_rooms_select" ON public.hearts_rooms
  FOR SELECT USING (true);
CREATE POLICY "hearts_rooms_insert" ON public.hearts_rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "hearts_rooms_update" ON public.hearts_rooms
  FOR UPDATE USING (auth.uid() = owner_id OR auth.role() = 'service_role');

-- Seats: public read, service role write (API routes manage seats)
CREATE POLICY "hearts_seats_select" ON public.hearts_seats
  FOR SELECT USING (true);
CREATE POLICY "hearts_seats_write" ON public.hearts_seats
  FOR ALL USING (auth.role() = 'service_role');

-- Game state: public read (clients subscribe directly), service role write
CREATE POLICY "hearts_state_select" ON public.hearts_game_state
  FOR SELECT USING (true);
CREATE POLICY "hearts_state_write" ON public.hearts_game_state
  FOR ALL USING (auth.role() = 'service_role');
