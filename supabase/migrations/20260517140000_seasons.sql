-- Training "seasons". Stats/history are scoped to the active season; starting
-- a new season archives the current one under a user-given name (data kept).
create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index if not exists idx_seasons_user
  on public.seasons(user_id, started_at desc);
-- At most one active (not yet ended) season per user.
create unique index if not exists idx_seasons_one_active
  on public.seasons(user_id) where ended_at is null;

alter table public.sessions
  add column if not exists season_id uuid references public.seasons(id) on delete set null;
create index if not exists idx_sessions_season on public.sessions(season_id);

alter table public.seasons enable row level security;

drop policy if exists "seasons_all_own" on public.seasons;
create policy "seasons_all_own" on public.seasons
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
