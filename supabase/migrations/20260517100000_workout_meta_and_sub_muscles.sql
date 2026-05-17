-- Per-session ad-hoc state: skipped exercises + set-count overrides.
-- Shape: { "skipped": ["<plan_exercise_id>", ...],
--          "setOverrides": { "<plan_exercise_id>": <int> } }
alter table public.sessions
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- Precise Russian sub-muscle tags, e.g. {'Плечи / задняя дельта','Трицепс / длинная головка'}.
-- Backfilled for the existing 50 system exercises by the next migration,
-- seeded for the +100 library, and searchable server-side.
alter table public.exercises
  add column if not exists sub_muscles text[];

create index if not exists idx_exercises_sub_muscles
  on public.exercises using gin(sub_muscles);
