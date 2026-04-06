-- ── Hearts game ──────────────────────────────────────────────────────────────

INSERT INTO public.games (slug, name)
VALUES ('hearts', 'Hearts')
ON CONFLICT (slug) DO NOTHING;

-- Total-wins ladder
INSERT INTO public.ladders (game_id, slug, name, score_type, primary_label, sort_primary)
SELECT id, 'global', 'Global Wins', 'total_wins', 'Wins', 'desc'
FROM public.games
WHERE slug = 'hearts'
ON CONFLICT (game_id, slug) DO NOTHING;
