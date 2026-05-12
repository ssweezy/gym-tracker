-- Enable RLS на всех пользовательских таблицах
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.sets enable row level security;

-- profiles: пользователь видит и меняет только себя
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- exercises: видны системные ИЛИ свои; свои можно править/удалять
create policy "exercises_select" on public.exercises for select using (is_system = true or user_id = auth.uid());
create policy "exercises_insert_own" on public.exercises for insert with check (user_id = auth.uid() and is_system = false);
create policy "exercises_update_own" on public.exercises for update using (user_id = auth.uid() and is_system = false);
create policy "exercises_delete_own" on public.exercises for delete using (user_id = auth.uid() and is_system = false);

-- plans: только свои
create policy "plans_all_own" on public.plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- plan_days: через join к plans
create policy "plan_days_all" on public.plan_days for all
  using (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid()));

-- plan_exercises: через двойной join
create policy "plan_exercises_all" on public.plan_exercises for all
  using (exists (
    select 1 from public.plan_days pd
    join public.plans wp on wp.id = pd.plan_id
    where pd.id = plan_day_id and wp.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.plan_days pd
    join public.plans wp on wp.id = pd.plan_id
    where pd.id = plan_day_id and wp.user_id = auth.uid()
  ));

-- sessions: только свои
create policy "sessions_all_own" on public.sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sets: через session
create policy "sets_all" on public.sets for all
  using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));

-- Trigger: автосоздание profile при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Спортсмен'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
