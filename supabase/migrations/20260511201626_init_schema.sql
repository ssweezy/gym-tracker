-- profiles
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default 'Спортсмен',
  bodyweight_kg   numeric(5,2),
  unit_system     text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  goal            text,
  created_at      timestamptz default now()
);

-- exercises (system + custom)
create table public.exercises (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  name              text not null,
  muscle_groups     text[] not null,
  increment_kg      numeric(4,2) default 2.5,
  description       text,
  technique_tips    text[],
  historical_fact   text,
  is_system         boolean default false,
  created_at        timestamptz default now()
);
create index idx_exercises_user on public.exercises(user_id) where user_id is not null;
create index idx_exercises_muscle on public.exercises using gin(muscle_groups);

-- plans
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  is_active   boolean default false,
  created_at  timestamptz default now()
);
create unique index idx_plans_one_active_per_user
  on public.plans(user_id) where is_active;

-- plan_days
create table public.plan_days (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),
  title       text,
  is_rest     boolean not null default false,
  order_idx   smallint not null default 0
);

-- plan_exercises
create table public.plan_exercises (
  id            uuid primary key default gen_random_uuid(),
  plan_day_id   uuid not null references public.plan_days(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id) on delete restrict,
  rep_category  text not null check (rep_category in ('strength','classic','beginner')),
  target_sets   smallint not null check (target_sets between 1 and 10),
  order_idx     smallint not null default 0
);

-- sessions
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan_day_id   uuid references public.plan_days(id) on delete set null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  notes         text
);
create index idx_sessions_user_started on public.sessions(user_id, started_at desc);

-- sets
create table public.sets (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete restrict,
  weight_kg       numeric(5,2) not null check (weight_kg >= 0),
  reps            smallint not null check (reps between 0 and 999),
  target_reps     smallint not null,
  is_first_set    boolean not null default false,
  reached_failure boolean,
  rpe             smallint check (rpe between 1 and 10),
  set_order       smallint not null,
  completed_at    timestamptz default now()
);
create index idx_sets_user_exercise_time on public.sets(exercise_id, completed_at desc);
create index idx_sets_session on public.sets(session_id);
