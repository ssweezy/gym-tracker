import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Dumbbell,
  Flame,
  History,
  Info,
  Layers,
  LogOut,
  Settings,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActivePlan } from '@/server/plans';
import { getFinishedSessionsWithDuration } from '@/server/sessions';
import { logout } from '@/lib/auth/actions';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { InstallAppCard } from '@/components/pwa/InstallAppCard';
import { cn } from '@/lib/utils';

const GOAL_LABEL: Record<string, string> = {
  hypertrophy: 'Гипертрофия',
  strength: 'Сила',
  endurance: 'Выносливость',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // All five top-level queries are independent — fan them out in parallel
  // instead of waiting for them serially across the Atlantic.
  const [
    profileResp,
    plan,
    sessionCountResp,
    setsAggResp,
    finishedWithDuration,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    getActivePlan(user.id),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('finished_at', 'is', null),
    supabase
      .from('sets')
      .select('weight_kg, reps, sessions!inner(user_id)')
      .eq('sessions.user_id', user.id),
    // Total cumulative training time across all finished sessions (last 2y
    // window is plenty for the foreseeable user lifetime here).
    getFinishedSessionsWithDuration(365 * 2),
  ]);

  const profile = profileResp.data;
  const sessionCount = sessionCountResp.count;
  const setsAgg = setsAggResp.data;
  const tonnage =
    (setsAgg ?? []).reduce((s, r) => s + r.weight_kg * r.reps, 0) / 1000;
  const totalMinutes = finishedWithDuration.reduce(
    (sum, s) => sum + s.duration_min,
    0,
  );
  const totalHours = totalMinutes / 60;
  const totalTimeLabel =
    totalMinutes < 60
      ? `${totalMinutes} мин`
      : `${totalHours.toFixed(1).replace('.', ',')} ч`;

  const totalSets = (setsAgg ?? []).length;
  const finishedCount = sessionCount ?? 0;
  const avgMin =
    finishedCount > 0 ? Math.round(totalMinutes / finishedCount) : 0;

  const finishedDates = finishedWithDuration
    .map((s) => new Date(s.finished_at))
    .sort((a, b) => b.getTime() - a.getTime());
  const lastWorkout = finishedDates[0] ?? null;
  const lastWorkoutLabel = lastWorkout
    ? lastWorkout.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      })
    : '—';

  // Consecutive-day streak ending today or yesterday.
  const dayKeys = new Set(
    finishedDates.map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    }),
  );
  let streak = 0;
  {
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    if (!dayKeys.has(cur.getTime())) cur.setDate(cur.getDate() - 1);
    while (dayKeys.has(cur.getTime())) {
      streak += 1;
      cur.setDate(cur.getDate() - 1);
    }
  }

  const displayName = profile?.display_name || 'Спортсмен';
  const goal = profile?.goal ? (GOAL_LABEL[profile.goal] ?? profile.goal) : '—';
  const joined = profile?.created_at
    ? new Date(profile.created_at)
    : new Date();
  const joinedLabel = `C ${joined.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}`;

  const yearStats = [
    {
      value: String(sessionCount ?? 0),
      label: 'Тренировок',
      color: 'text-text-primary',
    },
    {
      value: String(streak),
      label: 'Серия дн.',
      color: 'text-accent-crimson',
    },
    {
      value: tonnage > 0 ? tonnage.toFixed(1).replace('.', ',') : '0',
      label: 'Тонн',
      color: 'text-accent-green',
    },
  ];

  const trainingRows = [
    {
      icon: Dumbbell,
      label: 'Всего тренировок',
      value: String(finishedCount),
      iconBg: 'rgba(255,45,85,0.15)',
      iconColor: '#FF2D55',
    },
    {
      icon: Clock,
      label: 'Общее время',
      value: totalTimeLabel,
      iconBg: 'rgba(255,149,0,0.15)',
      iconColor: '#FF9500',
    },
    {
      icon: Timer,
      label: 'Средняя тренировка',
      value: avgMin > 0 ? `${avgMin} мин` : '—',
      iconBg: 'rgba(10,132,255,0.15)',
      iconColor: '#0A84FF',
    },
    {
      icon: Layers,
      label: 'Всего подходов',
      value: String(totalSets),
      iconBg: 'rgba(52,199,89,0.15)',
      iconColor: '#34C759',
    },
    {
      icon: Flame,
      label: 'Серия',
      value: streak > 0 ? `${streak} дн.` : '—',
      iconBg: 'rgba(255,45,85,0.15)',
      iconColor: '#FF2D55',
    },
    {
      icon: History,
      label: 'Последняя тренировка',
      value: lastWorkoutLabel,
      iconBg: 'rgba(142,142,147,0.2)',
      iconColor: '#A1A1A6',
    },
  ];

  const dataRows = [
    {
      icon: Download,
      label: 'Экспорт CSV',
      value: 'Скоро',
      iconBg: 'rgba(10,132,255,0.15)',
      iconColor: '#0A84FF',
    },
    {
      icon: Info,
      label: 'О приложении',
      value: 'v0.1.0',
      iconBg: 'rgba(142,142,147,0.2)',
      iconColor: '#A1A1A6',
    },
  ];

  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <div className="text-[13px] font-medium text-text-tertiary">Аккаунт</div>
        <h1
          className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          Профиль
        </h1>
      </Reveal>

      <Reveal className="mt-6">
        <div
          className="overflow-hidden rounded-[26px] p-5"
          style={{
            background:
              'radial-gradient(110% 90% at 0% 0%, rgba(255,45,85,0.12) 0%, rgba(255,45,85,0) 55%), radial-gradient(90% 80% at 100% 100%, rgba(52,199,89,0.10) 0%, rgba(52,199,89,0) 55%), #131316',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
                style={{
                  background:
                    'conic-gradient(from 220deg, #FF2D55, #FF9500, #34C759, #0A84FF, #FF2D55)',
                  padding: 3,
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-bg">
                  <span className="text-[28px] font-bold tracking-tight">
                    {displayName[0]}
                  </span>
                </div>
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-green ring-2 ring-bg"
                style={{ boxShadow: '0 0 12px -2px rgba(52,199,89,0.7)' }}
              >
                <Trophy size={10} strokeWidth={2.8} className="text-black" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight truncate">
                {displayName}
              </h2>
              <div className="mt-0.5 text-[13.5px] text-text-secondary">{goal}</div>
              <div className="text-[11.5px] text-text-tertiary">{joinedLabel}</div>
            </div>
            <Link
              href="/profile/settings"
              aria-label="Настройки"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] active:scale-90 transition-transform"
            >
              <Settings size={16} className="text-text-secondary" strokeWidth={2.2} />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-[18px] bg-black/30 p-2.5">
            {yearStats.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className={cn(
                    'text-[22px] font-bold tabular-nums leading-none tracking-tight',
                    s.color,
                  )}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {s.value}
                </div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {plan && (
        <Reveal className="mt-3">
          <Link
            href="/plan"
            className="block w-full overflow-hidden rounded-[22px] bg-bg-elevated p-5 text-left active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-accent-crimson" strokeWidth={2.4} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                    Активный план
                  </span>
                </div>
                <h3 className="mt-1.5 text-[19px] font-semibold leading-tight tracking-tight">
                  {plan.plan.name}
                </h3>
                <div className="mt-1 text-[12px] text-text-tertiary">
                  {plan.days.filter((d) => !d.is_rest).length} трен. в неделю ·{' '}
                  {plan.days.reduce(
                    (s, d) =>
                      s +
                      (d.is_rest
                        ? 0
                        : d.exercises.reduce((x, pe) => x + pe.target_sets, 0)),
                    0,
                  )}{' '}
                  подходов
                </div>
              </div>
              <ChevronRight size={18} className="text-text-tertiary shrink-0" />
            </div>
          </Link>
        </Reveal>
      )}

      <Reveal className="mt-3">
        <InstallAppCard />
      </Reveal>

      <Reveal className="mt-7">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Тренировки
        </h3>
        <SettingsCard items={trainingRows} />
      </Reveal>

      <Reveal className="mt-5">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Данные
        </h3>
        <SettingsCard items={dataRows} />
      </Reveal>

      <Reveal className="mt-5">
        <form action={logout}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-crimson/12 text-[14px] font-semibold text-accent-crimson active:bg-accent-crimson/18 transition-colors"
          >
            <LogOut size={15} strokeWidth={2.4} />
            Выйти
          </button>
        </form>
      </Reveal>

      <Reveal className="mt-5 text-center text-[11px] text-text-tertiary pb-2">
        Gym Tracker · 0.1.0
      </Reveal>
    </Stagger>
  );
}

interface SettingRow {
  icon: typeof Target;
  label: string;
  value?: string;
  iconBg: string;
  iconColor: string;
}

function SettingsCard({ items }: { items: SettingRow[] }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
      <ul className="divide-y divide-white/[0.04]">
        {items.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.label}>
              <div className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: row.iconBg }}
                >
                  <Icon size={14} strokeWidth={2.2} style={{ color: row.iconColor }} />
                </div>
                <span className="flex-1 text-[15px] font-medium tracking-tight">
                  {row.label}
                </span>
                {row.value && (
                  <span className="text-[13px] text-text-secondary tabular-nums">
                    {row.value}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
