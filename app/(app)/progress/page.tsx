import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, Dumbbell, Flame, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getFinishedSessionsWithDuration } from '@/server/sessions';
import { Stagger, Reveal } from '@/components/motion/stagger';
import {
  ProgressStatsSkeleton,
  ProgressRecordsSkeleton,
} from '@/components/skeletons/Skeletons';
import { RU_MONTHS_NOM } from '@/lib/date';
import { cn } from '@/lib/utils';

function formatDuration(min: number): string {
  if (min < 60) return `${min}м`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

const intensityStyle = (n: number): React.CSSProperties => {
  if (n === 0) return { backgroundColor: 'rgba(255,255,255,0.04)' };
  if (n === 1) return { backgroundColor: 'rgba(52,199,89,0.28)' };
  if (n === 2) return { backgroundColor: 'rgba(52,199,89,0.6)' };
  return {
    backgroundColor: '#34C759',
    boxShadow: '0 0 12px -2px rgba(52,199,89,0.6)',
  };
};

function intensityFromSets(setCount: number): number {
  if (setCount === 0) return 0;
  if (setCount <= 8) return 1;
  if (setCount <= 16) return 2;
  return 3;
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();

  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <div className="text-[13px] font-medium text-text-tertiary">
          {RU_MONTHS_NOM[now.getMonth()]} {now.getFullYear()}
        </div>
        <h1
          className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          Прогресс
        </h1>
      </Reveal>

      <Suspense fallback={<ProgressStatsSkeleton />}>
        <StatsAndHeatmap userId={user.id} now={now} />
      </Suspense>

      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Рабочие веса
        </h2>
      </Reveal>

      <Suspense fallback={<ProgressRecordsSkeleton />}>
        <WorkingWeights userId={user.id} />
      </Suspense>
    </Stagger>
  );
}

async function StatsAndHeatmap({
  userId,
  now,
}: {
  userId: string;
  now: Date;
}) {
  const supabase = await createClient();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);
  twelveWeeksAgo.setHours(0, 0, 0, 0);

  // All independent queries run in parallel.
  const [monthlyAll, setsResp, sessionDaysResp] = await Promise.all([
    getFinishedSessionsWithDuration(90),
    supabase
      .from('sets')
      .select('weight_kg, reps, completed_at, exercise_id, sessions!inner(user_id)')
      .eq('sessions.user_id', userId)
      .gte('completed_at', twelveWeeksAgo.toISOString()),
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(60),
  ]);

  const monthlyFinished = monthlyAll.filter(
    (s) => new Date(s.started_at) >= monthStart,
  );
  const monthlySessions = monthlyFinished.length;
  const monthlyMinutes = monthlyFinished.reduce(
    (sum, s) => sum + s.duration_min,
    0,
  );

  const sets = setsResp.data ?? [];
  const tonnage = sets.reduce((s, r) => s + r.weight_kg * r.reps, 0) / 1000;

  // 12 weeks x 7 days heatmap.
  const heat: number[][] = Array.from({ length: 12 }, () => Array(7).fill(0));
  for (const s of sets) {
    if (!s.completed_at) continue;
    const d = new Date(s.completed_at);
    const ms = twelveWeeksAgo.getTime();
    const dayOffset = Math.floor((d.getTime() - ms) / 86400000);
    if (dayOffset < 0 || dayOffset >= 84) continue;
    const week = Math.floor(dayOffset / 7);
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    heat[week][dow] += 1;
  }
  const heatIntensity = heat.map((w) => w.map(intensityFromSets));

  const sessionDays = sessionDaysResp.data ?? [];
  const daySet = new Set<string>();
  for (const s of sessionDays) {
    daySet.add(new Date(s.started_at).toDateString());
  }
  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  while (daySet.has(check.toDateString())) {
    streak += 1;
    check.setDate(check.getDate() - 1);
  }

  const stats = [
    {
      label: 'Тренировок',
      value: String(monthlySessions),
      sub: `за ${RU_MONTHS_NOM[now.getMonth()].toLowerCase()}`,
      icon: Dumbbell,
      color: 'text-text-primary',
      dot: '#FFFFFF',
    },
    {
      label: 'Время',
      value: formatDuration(monthlyMinutes),
      sub: `за ${RU_MONTHS_NOM[now.getMonth()].toLowerCase()}`,
      icon: Clock,
      color: 'text-accent-warning',
      dot: '#FF9500',
    },
    {
      label: 'Серия',
      value: String(streak),
      sub: 'дней',
      icon: Flame,
      color: 'text-accent-crimson',
      dot: '#FF2D55',
    },
    {
      label: 'Тонн',
      value: tonnage > 0 ? tonnage.toFixed(1).replace('.', ',') : '0',
      sub: 'поднято',
      icon: TrendingUp,
      color: 'text-accent-green',
      dot: '#34C759',
    },
  ];

  return (
    <>
      <Reveal className="mt-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ label, value, sub, icon: Icon, color, dot }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-[20px] bg-bg-elevated p-3.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={12} className={color} strokeWidth={2.4} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  {label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-[22px] font-bold tabular-nums leading-none tracking-tight',
                    color,
                  )}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {value}
                </span>
              </div>
              <div className="mt-1 text-[10.5px] text-text-tertiary">{sub}</div>
              <span
                className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: dot, boxShadow: `0 0 8px 0 ${dot}88` }}
              />
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-3">
        <div
          className="overflow-hidden rounded-[22px] p-5"
          style={{
            background:
              'radial-gradient(120% 80% at 100% 0%, rgba(52,199,89,0.08) 0%, rgba(52,199,89,0) 60%), #131316',
          }}
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              Активность
            </h2>
            <span className="text-[11px] text-text-tertiary">12 недель</span>
          </div>
          <div className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px] justify-items-center">
            {heatIntensity.flatMap((week, wi) =>
              week.map((intensity, di) => (
                <div
                  key={`${wi}-${di}`}
                  className="h-3.5 w-3.5 rounded-[3px]"
                  style={intensityStyle(intensity)}
                />
              )),
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-[10.5px] text-text-tertiary">
            <span>меньше</span>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(0)} />
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(1)} />
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(2)} />
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(3)} />
            </div>
            <span>больше</span>
          </div>
        </div>
      </Reveal>
    </>
  );
}

async function WorkingWeights({ userId }: { userId: string }) {
  const supabase = await createClient();
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);
  twelveWeeksAgo.setHours(0, 0, 0, 0);

  // Re-fetch the sets window for working-weight aggregation. Suspense lets
  // this run in parallel with `StatsAndHeatmap` instead of blocking it.
  const { data: rawSets } = await supabase
    .from('sets')
    .select('weight_kg, reps, completed_at, exercise_id, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('completed_at', twelveWeeksAgo.toISOString());

  const sets = rawSets ?? [];
  const byExercise = new Map<string, { maxWeight: number; lastDate: Date }>();
  for (const s of sets) {
    if (!s.completed_at) continue;
    const cur = byExercise.get(s.exercise_id);
    if (!cur || s.weight_kg > cur.maxWeight) {
      byExercise.set(s.exercise_id, {
        maxWeight: s.weight_kg,
        lastDate: new Date(s.completed_at),
      });
    }
  }
  const topExerciseIds = [...byExercise.entries()]
    .sort((a, b) => b[1].maxWeight - a[1].maxWeight)
    .slice(0, 6)
    .map(([id]) => id);

  const exerciseNames = new Map<string, string>();
  if (topExerciseIds.length > 0) {
    const { data: exRows } = await supabase
      .from('exercises')
      .select('id, name')
      .in('id', topExerciseIds);
    for (const ex of exRows ?? []) exerciseNames.set(ex.id, ex.name);
  }

  return (
    <Reveal className="mt-3 pb-2">
      <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
        {topExerciseIds.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
            Пока нет записей. Запиши первый подход — и здесь появятся твои рекорды.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {topExerciseIds.map((id) => {
              const data = byExercise.get(id)!;
              const name = exerciseNames.get(id) ?? '—';
              return (
                <li key={id}>
                  <Link
                    href={`/progress/${id}`}
                    className="block px-4 py-3.5 transition-colors active:bg-white/[0.03] hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                          {name}
                        </h3>
                        <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                          <span className="text-[18px] font-semibold leading-none">
                            {data.maxWeight.toString().replace('.', ',')}
                            <span className="ml-0.5 text-[11px] text-text-tertiary">
                              кг
                            </span>
                          </span>
                          <span className="text-[11px] text-text-tertiary">
                            обновлён {data.lastDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="shrink-0 text-text-tertiary"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Reveal>
  );
}
