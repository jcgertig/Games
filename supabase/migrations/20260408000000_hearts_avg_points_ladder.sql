-- ── Hearts: add avg-points ladder and running_avg score type ─────────────────
--
-- "running_avg" accumulates all game submissions and keeps a live running
-- average as primary_value.  Lower average = better rank (sort_primary asc).
-- The raw totals are preserved in metadata: { total_points, game_count }.

-- ── 1. Broaden the score_type check to include running_avg ────────────────────

ALTER TABLE public.ladders
  DROP CONSTRAINT IF EXISTS ladders_score_type_check;

ALTER TABLE public.ladders
  ADD CONSTRAINT ladders_score_type_check
  CHECK (score_type IN ('highest_score', 'lowest_time', 'total_wins', 'composite', 'running_avg'));

-- ── 2. Replace upsert_leaderboard_entry with running_avg support ──────────────

CREATE OR REPLACE FUNCTION public.upsert_leaderboard_entry(
  p_ladder_id       uuid,
  p_user_id         uuid,
  p_display_name    text,
  p_primary_value   numeric,
  p_secondary_value numeric,
  p_metadata        jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ladder         public.ladders;
  v_existing       public.leaderboard_entries;
  v_is_improvement boolean := false;
  v_rank_after     integer;
BEGIN
  SELECT * INTO v_ladder FROM public.ladders WHERE id = p_ladder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ladder not found: %', p_ladder_id;
  END IF;

  SELECT * INTO v_existing
  FROM public.leaderboard_entries
  WHERE ladder_id = p_ladder_id AND user_id = p_user_id;

  -- ── total_wins: accumulate ────────────────────────────────────────────────
  IF v_ladder.score_type = 'total_wins' THEN
    IF FOUND THEN
      UPDATE public.leaderboard_entries
      SET
        primary_value = primary_value + p_primary_value,
        display_name  = p_display_name,
        metadata      = p_metadata,
        submitted_at  = now()
      WHERE id = v_existing.id;
    ELSE
      INSERT INTO public.leaderboard_entries
        (ladder_id, user_id, display_name, primary_value, metadata)
      VALUES
        (p_ladder_id, p_user_id, p_display_name, p_primary_value, p_metadata);
    END IF;
    v_is_improvement := true;

  -- ── running_avg: keep live average, store totals in metadata ─────────────
  ELSIF v_ladder.score_type = 'running_avg' THEN
    IF FOUND THEN
      DECLARE
        v_old_total numeric := COALESCE((v_existing.metadata->>'total_points')::numeric, v_existing.primary_value);
        v_old_count integer := COALESCE((v_existing.metadata->>'game_count')::integer, 1);
        v_new_total numeric := v_old_total + p_primary_value;
        v_new_count integer := v_old_count + 1;
        v_new_avg   numeric := ROUND(v_new_total / v_new_count, 2);
      BEGIN
        UPDATE public.leaderboard_entries
        SET
          primary_value = v_new_avg,
          display_name  = p_display_name,
          metadata      = jsonb_build_object(
                            'total_points', v_new_total,
                            'game_count',   v_new_count
                          ),
          submitted_at  = now()
        WHERE id = v_existing.id;
      END;
    ELSE
      INSERT INTO public.leaderboard_entries
        (ladder_id, user_id, display_name, primary_value, metadata)
      VALUES (
        p_ladder_id,
        p_user_id,
        p_display_name,
        p_primary_value,
        jsonb_build_object('total_points', p_primary_value, 'game_count', 1)
      );
    END IF;
    v_is_improvement := true;

  -- ── best score / composite / lowest time: replace if better ──────────────
  ELSE
    IF FOUND THEN
      v_is_improvement := CASE v_ladder.sort_primary
        WHEN 'desc' THEN
          p_primary_value > v_existing.primary_value
          OR (p_primary_value = v_existing.primary_value
              AND v_ladder.sort_secondary = 'desc'
              AND COALESCE(p_secondary_value, 0) > COALESCE(v_existing.secondary_value, 0))
        WHEN 'asc' THEN
          p_primary_value < v_existing.primary_value
          OR (p_primary_value = v_existing.primary_value
              AND v_ladder.sort_secondary = 'asc'
              AND COALESCE(p_secondary_value, 0) < COALESCE(v_existing.secondary_value, 0))
      END;

      IF v_is_improvement THEN
        UPDATE public.leaderboard_entries
        SET
          display_name    = p_display_name,
          primary_value   = p_primary_value,
          secondary_value = p_secondary_value,
          metadata        = p_metadata,
          submitted_at    = now()
        WHERE id = v_existing.id;
      END IF;
    ELSE
      INSERT INTO public.leaderboard_entries
        (ladder_id, user_id, display_name, primary_value, secondary_value, metadata)
      VALUES
        (p_ladder_id, p_user_id, p_display_name, p_primary_value, p_secondary_value, p_metadata);
      v_is_improvement := true;
    END IF;
  END IF;

  -- ── trim to max_entries ───────────────────────────────────────────────────
  IF v_is_improvement THEN
    DELETE FROM public.leaderboard_entries
    WHERE ladder_id = p_ladder_id
      AND id NOT IN (
        SELECT id FROM public.leaderboard_entries
        WHERE ladder_id = p_ladder_id
        ORDER BY
          CASE WHEN v_ladder.sort_primary = 'desc' THEN primary_value  END DESC NULLS LAST,
          CASE WHEN v_ladder.sort_primary = 'asc'  THEN primary_value  END ASC  NULLS LAST,
          CASE WHEN v_ladder.sort_secondary = 'desc' THEN secondary_value END DESC NULLS LAST,
          CASE WHEN v_ladder.sort_secondary = 'asc'  THEN secondary_value END ASC  NULLS LAST,
          submitted_at ASC
        LIMIT v_ladder.max_entries
      );
  END IF;

  -- ── compute rank ─────────────────────────────────────────────────────────
  SELECT COUNT(*) + 1 INTO v_rank_after
  FROM public.leaderboard_entries le
  JOIN public.ladders l ON l.id = le.ladder_id
  WHERE le.ladder_id = p_ladder_id
    AND (
      CASE l.sort_primary
        WHEN 'desc' THEN le.primary_value > (
          SELECT primary_value FROM public.leaderboard_entries
          WHERE ladder_id = p_ladder_id AND user_id = p_user_id
        )
        WHEN 'asc' THEN le.primary_value < (
          SELECT primary_value FROM public.leaderboard_entries
          WHERE ladder_id = p_ladder_id AND user_id = p_user_id
        )
      END
    );

  RETURN jsonb_build_object(
    'is_improvement', v_is_improvement,
    'rank',           v_rank_after
  );
END;
$$;

-- ── 3. Seed the avg-points ladder ─────────────────────────────────────────────

INSERT INTO public.ladders (game_id, slug, name, score_type, primary_label, sort_primary)
SELECT id, 'avg-points', 'Avg Points Per Game', 'running_avg', 'Avg Pts', 'asc'
FROM public.games
WHERE slug = 'hearts'
ON CONFLICT (game_id, slug) DO NOTHING;
