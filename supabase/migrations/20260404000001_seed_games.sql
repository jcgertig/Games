-- ============================================================
-- SEED: existing games and their ladders
-- ============================================================

-- Games
insert into public.games (slug, name) values
  ('tic-tac-toe',  'Tic Tac Toe'),
  ('car-shot',     'Car Shot'),
  ('dancing-crab', 'Dancing Crab')
on conflict (slug) do nothing;

-- Tic Tac Toe: global wins ladder
insert into public.ladders (game_id, slug, name, score_type, primary_label, sort_primary)
select id, 'global', 'Global Wins', 'total_wins', 'Wins', 'desc'
from public.games where slug = 'tic-tac-toe'
on conflict (game_id, slug) do nothing;

-- Car Shot: global composite ladder (wheels + highest level)
insert into public.ladders (game_id, slug, name, score_type, primary_label, secondary_label, sort_primary, sort_secondary)
select id, 'global', 'Global', 'composite', 'Wheels', 'Highest Level', 'desc', 'desc'
from public.games where slug = 'car-shot'
on conflict (game_id, slug) do nothing;

-- Dancing Crab: global composite ladder
insert into public.ladders (game_id, slug, name, score_type, primary_label, secondary_label, sort_primary, sort_secondary)
select id, 'global', 'Global', 'composite', 'Score', 'Accuracy %', 'desc', 'desc'
from public.games where slug = 'dancing-crab'
on conflict (game_id, slug) do nothing;

-- Dancing Crab: per-song ladders
-- These slugs follow the pattern song:{song-slug}
-- Add more songs here as they are added to the game
insert into public.ladders (game_id, slug, name, score_type, primary_label, secondary_label, sort_primary, sort_secondary)
select g.id, l.slug, l.name, 'composite', 'Score', 'Accuracy %', 'desc', 'desc'
from public.games g
cross join (values
  ('song:night-owl',      'Night Owl'),
  ('song:dancing-fever',  'Dancing Fever'),
  ('song:crab-rave',      'Crab Rave')
) as l(slug, name)
where g.slug = 'dancing-crab'
on conflict (game_id, slug) do nothing;
