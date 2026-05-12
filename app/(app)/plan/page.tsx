import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Flame, Plus, Timer } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActivePlan, listUserPlans, planDayMuscles } from '@/server/plans';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { WeekTimeline, type WeekTimelineDay } from '@/components/plan/WeekTimeline';
import {
  WeeklyVolumePanel,
  type VolumeRow,
  type BreakdownDay,
} from '@/components/plan/WeeklyVolumePanel';
import { ChangePlanButton } from '@/components/plan/ChangePlanButton';
import {
  WeekTimelineSkeleton,
  VolumePanelSkeleton,
} from '@/components/skeletons/Skeletons';
import {
  computeWeeklyVolume,
  statusFor,
  MUSCLE_LABELS,
  type MuscleGroup,
} from '@/lib/volume';
import {
  formatRuDate,
  getISOWeek,
  getMondayOfWeek,
  RU_MONTHS_NOM,
  toSchemaWeekday,
} from '@/lib/date';

const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
];

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();
  const monday = getMondayOfWeek(today);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return (
    <Stagger className="px-5 pt-9">
      <Reveal className="flex items-baseline justify-between">
        <div className="text-[13px] font-medium text-text-tertiary">
          {monday.getDate()}–{sunday.getDate()} {RU_MONTHS_NOM[monday.getMonth()].toLowerCase()} · {RU_MONTHS_NOM[monday.getMonth()]} &apos;{String(monday.getFullYear()).slice(2)}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary tabular-nums">
          Неделя {getISOWeek(today)}
        </div>
      </Reveal>

      <Suspense fallback={<PlanBodyFallback />}>
        <PlanBody userId={user.id} today={today} monday={monday} />
      </Suspense>
    </Stagger>
  );
}

function PlanBodyFallback() {
  return (
    <>
      <Reveal className="mt-2 flex items-start justify-between gap-3">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          На этой неделе
        </h1>
      </Reveal>
      <WeekTimelineSkeleton />
      <VolumePanelSkeleton />
    </>
  );
}

async function PlanBody({
  userId,
  today,
  monday,
}: {
  userId: string;
  today: Date;
  monday: Date;
}) {
  // Independent top-level queries run in parallel.
  const [plan, planLibrary] = await Promise.all([
    getActivePlan(userId),
    listUserPlans(userId),
  ]);

  const weekday = toSchemaWeekday(today);

  if (!plan) {
    return (
      <>
        <Reveal className="mt-2 flex items-start justify-between gap-3">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            На этой неделе
          </h1>
          <ChangePlanButton hasActivePlan={false} plans={planLibrary} />
        </Reveal>
        <Reveal className="mt-6 rounded-[22px] bg-bg-elevated p-6 text-center">
          <p className="text-[14px] text-text-secondary">
            Активный план не найден. Создай новый из пресета или собери свой.
          </p>
        </Reveal>
      </>
    );
  }

  const days: WeekTimelineDay[] = plan.days.map((d) => ({
    id: d.id,
    weekday: d.weekday,
    is_rest: d.is_rest,
    title: d.title,
    exerciseCount: d.exercises.length,
  }));

  const todayDay = plan.days.find((d) => d.weekday === weekday);

  const volumes = computeWeeklyVolume(
    plan.days.map((d) => ({
      is_rest: d.is_rest,
      exercises: d.exercises.map((pe) => ({
        target_sets: pe.target_sets,
        exercise: {
          muscle_groups: pe.exercise.muscle_groups as MuscleGroup[],
        },
      })),
    })),
  );

  const volumeRows: VolumeRow[] = ALL_MUSCLES.map((g) => ({
    group: g,
    sets: volumes[g] ?? 0,
    status: statusFor(g, volumes[g] ?? 0),
  })).filter((r) => r.sets > 0);

  const breakdownDays: BreakdownDay[] = plan.days.map((d) => ({
    id: d.id,
    weekday: d.weekday,
    title: d.title,
    is_rest: d.is_rest,
    exercises: d.exercises.map((pe) => ({
      name: pe.exercise.name,
      target_sets: pe.target_sets,
      muscle_groups: pe.exercise.muscle_groups,
    })),
  }));

  const totalSets = plan.days.reduce(
    (s, d) => s + (d.is_rest ? 0 : d.exercises.reduce((x, pe) => x + pe.target_sets, 0)),
    0,
  );

  return (
    <>
      <Reveal className="mt-2 flex items-start justify-between gap-3">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          На этой неделе
        </h1>
        <ChangePlanButton hasActivePlan={true} plans={planLibrary} />
      </Reveal>

      <Reveal className="mt-6">
        <WeekTimeline days={days} todayWeekday={weekday} weekStartDate={monday} />
      </Reveal>

      {todayDay && !todayDay.is_rest && (
        <Reveal className="mt-3">
          <Link
            href={`/plan/edit/${todayDay.id}`}
            className="block w-full overflow-hidden rounded-[22px] p-5 text-left active:scale-[0.995] transition-transform"
            style={{
              background:
                'radial-gradient(110% 90% at 100% 0%, rgba(255,45,85,0.12) 0%, rgba(255,45,85,0) 60%), #131316',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-crimson" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                    Сегодня · {formatRuDate(today)}
                  </span>
                </div>
                <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
                  {todayDay.title || 'Тренировка'}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {planDayMuscles(todayDay).slice(0, 5).map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                    >
                      {MUSCLE_LABELS[m]}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-text-tertiary tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Flame size={13} className="text-accent-crimson" />{' '}
                    {todayDay.exercises.reduce((s, pe) => s + pe.target_sets, 0)} подходов
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Timer size={13} /> ~{todayDay.exercises.length * 10} мин
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="shrink-0 text-text-tertiary" />
            </div>
          </Link>
        </Reveal>
      )}

      <Reveal className="mt-7 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Объём за неделю
        </h3>
        <span className="text-[12px] text-text-tertiary tabular-nums">
          {totalSets} подходов
        </span>
      </Reveal>

      <Reveal className="mt-3">
        {volumeRows.length === 0 ? (
          <div className="rounded-[22px] bg-bg-elevated p-5 text-[13px] text-text-tertiary">
            В плане пока нет упражнений. Добавь хотя бы одно, чтобы увидеть объём.
          </div>
        ) : (
          <WeeklyVolumePanel rows={volumeRows} days={breakdownDays} />
        )}
      </Reveal>

      <Reveal className="mt-3 flex items-center gap-4 px-1 text-[11px] text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />&lt; 4
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />4–10
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-warning" />&gt; 10
        </span>
      </Reveal>

      <Reveal className="mt-5 pb-2">
        <Link
          href="/exercises"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] text-[14px] font-semibold text-text-secondary hover:bg-white/[0.02] transition-colors"
        >
          <Plus size={16} />
          Добавить упражнение в план
        </Link>
      </Reveal>
    </>
  );
}
