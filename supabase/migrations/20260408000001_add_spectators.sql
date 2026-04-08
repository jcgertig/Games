-- Remove stale completed rooms (cascades to online_seats, online_game_state)
DELETE FROM online_rooms WHERE status = 'done';

-- Add spectators column for standby viewers
-- Each entry: { user_id: string, display_name: string }
ALTER TABLE online_rooms ADD COLUMN spectators jsonb NOT NULL DEFAULT '[]';
