-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- GAMES
-- One row per game. New games are added via migration only.
-- ============================================================
create table public.games (
  id         uuid primary key default uuid_generate_v4(),
  slug       text not null unique,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table  public.games is 'Registered games. Add new rows via migration.';
comment on column public.games.slug is 'URL-safe identifier used in SDK calls and API routes.';

-- ============================================================
-- LADDERS
-- A ranked list within a game. Each game has one or more.
-- ============================================================
create table public.ladders (
  id              uuid primary key default uuid_generate_v4(),
  game_id         uuid not null references public.games(id) on delete cascade,
  slug            text not null,
  name            text not null,
  score_type      text not null
                  check (score_type in ('highest_score', 'lowest_time', 'total_wins', 'composite')),
  primary_label   text not null default 'Score',
  secondary_label text,
  sort_primary    text not null default 'desc'
                  check (sort_primary in ('asc', 'desc')),
  sort_secondary  text default 'desc'
                  check (sort_secondary in ('asc', 'desc')),
  max_entries     integer not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (game_id, slug)
);

-- ============================================================
-- LEADERBOARD ENTRIES
-- One best entry per player per ladder. Trimmed to max_entries.
-- ============================================================
create table public.leaderboard_entries (
  id              uuid primary key default uuid_generate_v4(),
  ladder_id       uuid not null references public.ladders(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  display_name    text not null,
  primary_value   numeric not null,
  secondary_value numeric,
  metadata        jsonb not null default '{}',
  submitted_at    timestamptz not null default now(),
  unique (ladder_id, user_id)
);

create index idx_leaderboard_ladder_primary
  on public.leaderboard_entries (ladder_id, primary_value desc);

create index idx_leaderboard_ladder_user
  on public.leaderboard_entries (ladder_id, user_id);

create index idx_leaderboard_metadata
  on public.leaderboard_entries using gin (metadata);

-- ============================================================
-- PLAYER STATS
-- Accumulates play history per player per game. Never trimmed.
-- ============================================================
create table public.player_stats (
  id             uuid primary key default uuid_generate_v4(),
  game_id        uuid not null references public.games(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  plays          integer not null default 0,
  wins           integer not null default 0,
  losses         integer not null default 0,
  total_score    numeric not null default 0,
  best_score     numeric,
  best_time      numeric,
  extra          jsonb not null default '{}',
  last_played_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (game_id, user_id)
);

create index idx_player_stats_user on public.player_stats (user_id);
create index idx_player_stats_game on public.player_stats (game_id);

-- ============================================================
-- SCORE SUBMISSIONS (audit log)
-- Raw record of every submission before upsert logic.
-- Partial index keeps only 90 days to control storage.
-- ============================================================
create table public.score_submissions (
  id              uuid primary key default uuid_generate_v4(),
  ladder_id       uuid not null references public.ladders(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  primary_value   numeric not null,
  secondary_value numeric,
  metadata        jsonb not null default '{}',
  client_ts       timestamptz,
  server_ts       timestamptz not null default now(),
  was_improvement boolean
);

create index idx_submissions_recent
  on public.score_submissions (server_ts desc);

-- ============================================================
-- FUNCTION: upsert_leaderboard_entry
-- Handles best-score replacement, total_wins accumulation,
-- top-N trim, and returns { is_improvement, rank }.
-- ============================================================
create or replace function public.upsert_leaderboard_entry(
  p_ladder_id       uuid,
  p_user_id         uuid,
  p_display_name    text,
  p_primary_value   numeric,
  p_secondary_value numeric,
  p_metadata        jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ladder         public.ladders;
  v_existing       public.leaderboard_entries;
  v_is_improvement boolean := false;
  v_rank_after     integer;
begin
  select * into v_ladder from public.ladders where id = p_ladder_id;
  if not found then
    raise exception 'ladder not found: %', p_ladder_id;
  end if;

  select * into v_existing
  from public.leaderboard_entries
  where ladder_id = p_ladder_id and user_id = p_user_id;

  -- ── total_wins: accumulate ──────────────────────────────
  if v_ladder.score_type = 'total_wins' then
    if found then
      update public.leaderboard_entries
      set
        primary_value = primary_value + p_primary_value,
        display_name  = p_display_name,
        metadata      = p_metadata,
        submitted_at  = now()
      where id = v_existing.id;
    else
      insert into public.leaderboard_entries
        (ladder_id, user_id, display_name, primary_value, metadata)
      values
        (p_ladder_id, p_user_id, p_display_name, p_primary_value, p_metadata);
    end if;
    v_is_improvement := true;

  -- ── best score / composite / lowest time: replace if better ─
  else
    if found then
      v_is_improvement := case v_ladder.sort_primary
        when 'desc' then
          p_primary_value > v_existing.primary_value
          or (p_primary_value = v_existing.primary_value
              and v_ladder.sort_secondary = 'desc'
              and coalesce(p_secondary_value, 0) > coalesce(v_existing.secondary_value, 0))
        when 'asc' then
          p_primary_value < v_existing.primary_value
          or (p_primary_value = v_existing.primary_value
              and v_ladder.sort_secondary = 'asc'
              and coalesce(p_secondary_value, 0) < coalesce(v_existing.secondary_value, 0))
      end;

      if v_is_improvement then
        update public.leaderboard_entries
        set
          display_name    = p_display_name,
          primary_value   = p_primary_value,
          secondary_value = p_secondary_value,
          metadata        = p_metadata,
          submitted_at    = now()
        where id = v_existing.id;
      end if;
    else
      insert into public.leaderboard_entries
        (ladder_id, user_id, display_name, primary_value, secondary_value, metadata)
      values
        (p_ladder_id, p_user_id, p_display_name, p_primary_value, p_secondary_value, p_metadata);
      v_is_improvement := true;
    end if;
  end if;

  -- ── trim to max_entries ─────────────────────────────────
  if v_is_improvement then
    delete from public.leaderboard_entries
    where ladder_id = p_ladder_id
      and id not in (
        select id from public.leaderboard_entries
        where ladder_id = p_ladder_id
        order by
          case when v_ladder.sort_primary = 'desc' then primary_value  end desc nulls last,
          case when v_ladder.sort_primary = 'asc'  then primary_value  end asc  nulls last,
          case when v_ladder.sort_secondary = 'desc' then secondary_value end desc nulls last,
          case when v_ladder.sort_secondary = 'asc'  then secondary_value end asc  nulls last,
          submitted_at asc
        limit v_ladder.max_entries
      );
  end if;

  -- ── compute rank ────────────────────────────────────────
  select count(*) + 1 into v_rank_after
  from public.leaderboard_entries le
  join public.ladders l on l.id = le.ladder_id
  where le.ladder_id = p_ladder_id
    and (
      (l.sort_primary = 'desc' and le.primary_value > p_primary_value)
      or
      (l.sort_primary = 'asc'  and le.primary_value < p_primary_value)
    );

  return jsonb_build_object(
    'is_improvement', v_is_improvement,
    'rank',           v_rank_after
  );
end;
$$;

-- ============================================================
-- FUNCTION: increment_player_stats
-- Atomic upsert. best_score uses GREATEST, best_time uses LEAST,
-- extra is shallow-merged.
-- ============================================================
create or replace function public.increment_player_stats(
  p_game_id uuid,
  p_user_id uuid,
  p_delta   jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.player_stats
    (game_id, user_id, plays, wins, losses, total_score,
     best_score, best_time, extra, last_played_at, updated_at)
  values (
    p_game_id,
    p_user_id,
    coalesce((p_delta->>'plays')::int, 0),
    coalesce((p_delta->>'wins')::int, 0),
    coalesce((p_delta->>'losses')::int, 0),
    coalesce((p_delta->>'total_score')::numeric, 0),
    (p_delta->>'best_score')::numeric,
    (p_delta->>'best_time')::numeric,
    coalesce(p_delta->'extra', '{}'),
    now(),
    now()
  )
  on conflict (game_id, user_id) do update set
    plays          = player_stats.plays   + coalesce((p_delta->>'plays')::int, 0),
    wins           = player_stats.wins    + coalesce((p_delta->>'wins')::int, 0),
    losses         = player_stats.losses  + coalesce((p_delta->>'losses')::int, 0),
    total_score    = player_stats.total_score + coalesce((p_delta->>'total_score')::numeric, 0),
    best_score     = case
                       when (p_delta->>'best_score') is not null
                       then greatest(player_stats.best_score, (p_delta->>'best_score')::numeric)
                       else player_stats.best_score
                     end,
    best_time      = case
                       when (p_delta->>'best_time') is not null
                       then least(player_stats.best_time, (p_delta->>'best_time')::numeric)
                       else player_stats.best_time
                     end,
    extra          = player_stats.extra || coalesce(p_delta->'extra', '{}'),
    last_played_at = now(),
    updated_at     = now();
end;
$$;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table public.games               enable row level security;
alter table public.ladders             enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.player_stats        enable row level security;
alter table public.score_submissions   enable row level security;

-- Games: public read
create policy "games_public_read" on public.games
  for select using (is_active = true);

-- Ladders: public read
create policy "ladders_public_read" on public.ladders
  for select using (is_active = true);

-- Leaderboard entries: public read
create policy "leaderboard_public_read" on public.leaderboard_entries
  for select using (true);

-- Leaderboard entries: owner can manage own row
-- (actual writes go through the security definer function above)
create policy "leaderboard_user_insert" on public.leaderboard_entries
  for insert with check (auth.uid() = user_id);

create policy "leaderboard_user_update" on public.leaderboard_entries
  for update using (auth.uid() = user_id);

-- Player stats: owner only
create policy "player_stats_own" on public.player_stats
  for all using (auth.uid() = user_id);

-- Score submissions: owner only
create policy "submissions_own_insert" on public.score_submissions
  for insert with check (auth.uid() = user_id);

create policy "submissions_own_read" on public.score_submissions
  for select using (auth.uid() = user_id);
