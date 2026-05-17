import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Flame, Timer } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getActivePlan, getPlanDay, planDayMuscles } from '@/server/plans';
import {
  getCurrentSession,
  getFinishedSessions,
} from '@/server/sessions';
import {
  getSetsForSession,
  getSetHistoryForExercise,
  getPersonalBest,
} from '@/server/sets';
import { listExercises } from '@/server/exercises';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { ActivityRings } from '@/components/workout/ActivityRings';
import { SessionControls } from '@/components/workout/SessionControls';
import { SessionTimer } from '@/components/workout/SessionTimer';
import { StartWorkoutButton } from '@/components/workout/StartWorkoutButton';
import { WeekSchedule } from '@/components/workout/WeekSchedule';
import {
  PlanExerciseFlow,
  type PlanExerciseFlowItem,
} from '@/components/workout/PlanExerciseFlow';
import {
  TodayHeroSkeleton,
  TodayExerciseListSkeleton,
} from '@/components/skeletons/Skeletons';
import type { SessionMeta } from '@/server/types';
import { suggestNext, type RepCategory } from '@/lib/progression';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { formatRuDate, RU_WEEKDAY_LONG, toSchemaWeekday } from '@/lib/date';

const COLORS = {
  crimson: '#FF2D55',
  green: '#34C759',
  orange: '#FF9500',
};

/** Compute consecutive-day streak ending today or yesterday. */
function computeStreak(finishedDates: Date[]): number {
  if (finishedDates.length === 0) return 0;
  const dayKeys = new Set(
    finishedDates.map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    }),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let cursor: Date;
  if (dayKeys.has(today.getTime())) cursor = today;
  else if (dayKeys.has(yesterday.getTime())) cursor = yesterday;
  else return 0;

  let streak = 0;
  while (dayKeys.has(cursor.getTime())) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function daysSince(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const wd = ((out.getDay() + 6) % 7); // 0 = Monday
  out.setDate(out.getDate() - wd);
  return out;
}

function ruDaysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}

// ---------------------------------------------------------------------------
// Page entry point — auth gate runs synchronously, then the page splits into
// a static header and Suspense-boundary sections that stream independently.
// ---------------------------------------------------------------------------
export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();

  return (
    <Stagger className="px-5 pt-9">
      <Reveal className="flex items-baseline justify-between">
        <div className="text-[13px] font-medium text-text-tertiary">
          {RU_WEEKDAY_LONG[today.getDay()]} · {formatRuDate(today)}
        </div>
      </Reveal>

      <Suspense fallback={<HeaderAndHeroSkeleton />}>
        <TodayBody userId={user.id} today={today} />
      </Suspense>
    </Stagger>
  );
}

function HeaderAndHeroSkeleton() {
  return (
    <>
      <Reveal className="mt-2">
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]">
          Сегодня
        </h1>
      </Reveal>
      <TodayHeroSkeleton />
      <TodayExerciseListSkeleton />
    </>
  );
}

// ---------------------------------------------------------------------------
// All async data lives inside this component so the page shell streams first
// and the body fills in once Supabase responds. Within `TodayBody` we kick off
// all independent queries with Promise.all, and once we know we're in an
// active session we also parallelize the per-exercise history/PB fetches.
// ---------------------------------------------------------------------------
async function TodayBody({ userId, today }: { userId: string; today: Date }) {
  const weekday = toSchemaWeekday(today);

  // Top-level independent queries.
  const [plan, currentSession, finishedSessions] = await Promise.all([
    getActivePlan(userId),
    getCurrentSession(),
    getFinishedSessions(90),
  ]);

  const finishedDates = finishedSessions
    .map((s) => (s.finished_at ? new Date(s.finished_at) : null))
    .filter((d): d is Date => d !== null);
  const streak = computeStreak(finishedDates);
  const lastWorkoutDays = finishedDates.length > 0 ? daysSince(finishedDates[0]) : null;
  const weekStart = startOfWeek(today);
  const weekDoneCount = finishedDates.filter((d) => d >= weekStart).length;
  const weekTotal = plan ? plan.days.filter((d) => !d.is_rest).length || 1 : 1;

  // -------- ACTIVE SESSION (plan day OR ad-hoc) --------
  if (currentSession) {
    if (!currentSession.plan_day_id) {
      // Defensive: legacy off-plan sessions had plan_day_id=null. New flow
      // always attaches a hidden plan_day, but we surface a graceful fallback.
      return (
        <>
          <Reveal className="mt-2">
            <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]">
              Сегодня
            </h1>
          </Reveal>
          <Reveal className="mt-6 rounded-[22px] bg-bg-elevated p-6 text-center">
            <p className="text-[14px] text-text-secondary">
              Активная тренировка не связана с днём плана. Заверши её и начни новую.
            </p>
            <div className="mt-4">
              <SessionControls
                sessionId={currentSession.id}
                planDayId={null}
                totalSets={0}
                doneSets={0}
                totalKg={0}
                startedAt={currentSession.started_at ?? null}
              />
            </div>
          </Reveal>
        </>
      );
    }

    // Day + initial set rows + catalog can all run in parallel.
    const [planDay, setsRows, catalog] = await Promise.all([
      getPlanDay(currentSession.plan_day_id),
      getSetsForSession(currentSession.id),
      listExercises({}),
    ]);

    if (!planDay) {
      redirect('/');
    }

    // Per-session ad-hoc state: skipped exercises + set-count overrides.
    const meta = ((currentSession as { meta?: SessionMeta }).meta ??
      {}) as SessionMeta;
    const skippedSet = new Set(meta.skipped ?? []);
    const setOverrides = meta.setOverrides ?? {};
    const effectiveTargetSets = (pe: { id: string; target_sets: number }) =>
      setOverrides[pe.id] ?? pe.target_sets;

    // Skipped exercises are excluded from the workout total so progress can
    // still reach 100%.
    const totalSets = planDay.exercises
      .filter((pe) => !skippedSet.has(pe.id))
      .reduce((s, pe) => s + effectiveTargetSets(pe), 0);
    const doneSets = setsRows.length;

    const setsByExercise = new Map<string, typeof setsRows>();
    for (const s of setsRows) {
      const arr = setsByExercise.get(s.exercise_id) ?? [];
      arr.push(s);
      setsByExercise.set(s.exercise_id, arr);
    }

    // Parallelize per-exercise queries (was sequential N+1: ~2 RTTs per exercise).
    const exerciseIds = planDay.exercises.map((pe) => pe.exercise_id);
    const [histories, personalBests] = await Promise.all([
      Promise.all(exerciseIds.map((id) => getSetHistoryForExercise(id, 5))),
      Promise.all(exerciseIds.map((id) => getPersonalBest(id))),
    ]);

    const planFlowItems: PlanExerciseFlowItem[] = planDay.exercises.map(
      (pe, i) => {
        const history = histories[i];
        const pb = personalBests[i];
        const sug = suggestNext(
          history,
          pe.rep_category as RepCategory,
          pe.exercise.increment_kg ?? 2.5,
          today,
        );
        const sets = setsByExercise.get(pe.exercise_id) ?? [];
        return {
          planExerciseId: pe.id,
          exerciseId: pe.exercise_id,
          exerciseName: pe.exercise.name,
          category: pe.rep_category as RepCategory,
          targetSets: effectiveTargetSets(pe),
          incrementKg: pe.exercise.increment_kg ?? 2.5,
          doneSets: sets.map((s) => ({
            weight_kg: s.weight_kg,
            reps: s.reps,
            is_first_set: s.is_first_set,
            completed_at: s.completed_at ?? null,
          })),
          target: {
            suggestion: {
              weight_kg: sug.weight_kg,
              target_reps: sug.target_reps,
              min_reps_followups: sug.min_reps_followups,
              reasoning: sug.reasoning,
            },
            last:
              history[0] !== undefined
                ? { weight_kg: history[0].weight_kg, reps: history[0].reps }
                : undefined,
          },
          personalBest: pb ? { weight_kg: pb.weight_kg, reps: pb.reps } : null,
        };
      },
    );

    // A "resolved" exercise is one that's either fully logged OR explicitly
    // skipped — both stop blocking the workout from reaching 100%.
    const completedExerciseCount = planFlowItems.filter(
      (it) =>
        skippedSet.has(it.planExerciseId) ||
        it.doneSets.length >= it.targetSets,
    ).length;

    const totalKg = setsRows.reduce((s, r) => s + r.weight_kg * r.reps, 0);
    const muscles = planDayMuscles(planDay);

    const workoutPct = totalSets > 0 ? doneSets / totalSets : 0;
    const weekWorkoutDays = plan ? plan.days.filter((d) => !d.is_rest).length : 1;
    const existingIds = new Set(planDay.exercises.map((pe) => pe.exercise_id));

    return (
      <>
        <Reveal className="flex items-baseline justify-end gap-3">
          <div className="flex items-center gap-2">
            {currentSession.started_at && (
              <SessionTimer startedAt={currentSession.started_at} />
            )}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-green/12 px-2.5 py-1 text-[11px] font-semibold text-accent-green">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
              </span>
              В процессе
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-2">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01", "tnum"' }}
          >
            Тренировка
          </h1>
        </Reveal>

        <Reveal className="mt-6">
          <div
            className="relative overflow-hidden rounded-[26px] p-5"
            style={{
              background:
                'radial-gradient(120% 90% at 100% 0%, rgba(255,45,85,0.10) 0%, rgba(255,45,85,0) 55%), linear-gradient(180deg, #131316 0%, #0B0B0E 100%)',
            }}
          >
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <ActivityRings
                  size={148}
                  stroke={14}
                  gap={3}
                  rings={[
                    { color: COLORS.crimson, progress: workoutPct },
                    { color: COLORS.green, progress: completedExerciseCount / Math.max(1, planDay.exercises.length) },
                    { color: COLORS.orange, progress: Math.min(1, weekWorkoutDays / 5) },
                  ]}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[30px] font-bold tabular-nums leading-none tracking-tight"
                    style={{ fontFeatureSettings: '"tnum"' }}
                  >
                    {Math.round(workoutPct * 100)}
                    <span className="ml-0.5 text-[16px] font-semibold text-text-tertiary">
                      %
                    </span>
                  </span>
                </div>
              </div>
              <ul className="flex-1 min-w-0 space-y-2.5">
                <li>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: COLORS.crimson,
                        boxShadow: `0 0 12px 0 ${COLORS.crimson}55`,
                      }}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                      Тренировка
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5 pl-[18px]">
                    <span className="text-[22px] font-semibold tabular-nums leading-none tracking-tight">
                      {doneSets}/{totalSets}
                    </span>
                    <span className="text-[12px] text-text-tertiary">подходов</span>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: COLORS.green,
                        boxShadow: `0 0 12px 0 ${COLORS.green}55`,
                      }}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                      Упражнения
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5 pl-[18px]">
                    <span className="text-[22px] font-semibold tabular-nums leading-none tracking-tight">
                      {completedExerciseCount}/{planDay.exercises.length}
                    </span>
                    <span className="text-[12px] text-text-tertiary">готово</span>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: COLORS.orange,
                        boxShadow: `0 0 12px 0 ${COLORS.orange}55`,
                      }}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                      Тоннаж
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5 pl-[18px]">
                    <span className="text-[22px] font-semibold tabular-nums leading-none tracking-tight">
                      {(totalKg / 1000).toFixed(1)}
                    </span>
                    <span className="text-[12px] text-text-tertiary">тонн</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-3">
          <div className="block w-full overflow-hidden rounded-[22px] bg-bg-elevated p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-crimson" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                    Сегодня
                  </span>
                </div>
                <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
                  {planDay.title || 'Тренировка'}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {muscles.slice(0, 5).map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                    >
                      {MUSCLE_LABELS[m as MuscleGroup]}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-text-tertiary tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Flame size={13} className="text-accent-crimson" /> {doneSets}/{totalSets} подходов
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Timer size={13} /> ~{planDay.exercises.length * 10} мин
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <PlanExerciseFlow
          sessionId={currentSession.id}
          planDayId={planDay.id}
          items={planFlowItems}
          skippedExerciseIds={Array.from(skippedSet)}
          catalog={catalog.map((ex) => ({
            id: ex.id,
            name: ex.name,
            muscle_groups: ex.muscle_groups,
            is_system: ex.is_system ?? true,
          }))}
          existingExerciseIds={Array.from(existingIds)}
        />

        <Reveal>
          <SessionControls
            sessionId={currentSession.id}
            planDayId={planDay.id}
            totalSets={totalSets}
            doneSets={doneSets}
            totalKg={totalKg}
            startedAt={currentSession.started_at ?? null}
          />
        </Reveal>
      </>
    );
  }

  // -------- NO ACTIVE SESSION --------
  if (!plan) {
    return (
      <>
        <Reveal className="mt-2">
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]">
            Сегодня
          </h1>
        </Reveal>
        <Reveal className="mt-6 rounded-[22px] bg-bg-elevated p-6 text-center">
          <p className="text-[14px] text-text-secondary">
            Активный план не найден. Заверши онбординг, чтобы начать.
          </p>
        </Reveal>
        <Reveal className="mt-4">
          <StartWorkoutButton planDayId={null} variant="secondary" />
        </Reveal>
      </>
    );
  }

  const todayDay = plan.days.find((d) => d.weekday === weekday);
  const hasPlannedToday = todayDay && !todayDay.is_rest && todayDay.exercises.length > 0;

  // -------- IDLE: planned workout today --------
  if (hasPlannedToday && todayDay) {
    const totalSets = todayDay.exercises.reduce((s, pe) => s + pe.target_sets, 0);
    const muscles = planDayMuscles(todayDay);
    const minutes = Math.max(todayDay.exercises.length * 10, 30);

    return (
      <>
        <Reveal className="flex items-baseline justify-end">
          <div className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-text-tertiary">
            Готов
          </div>
        </Reveal>

        <Reveal className="mt-2">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01", "tnum"' }}
          >
            Тренировка
          </h1>
        </Reveal>

        <Reveal className="mt-6 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-bg-elevated p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              <Flame size={12} className="text-accent-warning" /> Серия
            </div>
            <div className="mt-2 text-[24px] font-bold tabular-nums leading-none">
              {streak}
            </div>
            <div className="mt-1 text-[11px] text-text-tertiary">
              {streak === 0
                ? lastWorkoutDays !== null
                  ? `${lastWorkoutDays} ${ruDaysWord(lastWorkoutDays)} назад`
                  : 'Без тренировок'
                : `${ruDaysWord(streak)} подряд`}
            </div>
          </div>
          <div className="rounded-2xl bg-bg-elevated p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              На неделе
            </div>
            <div className="mt-2 flex items-baseline gap-1 tabular-nums">
              <span className="text-[24px] font-bold leading-none">
                {weekDoneCount}
              </span>
              <span className="text-[12px] text-text-tertiary">
                / {weekTotal}
              </span>
            </div>
            <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent-green"
                style={{
                  width: `${Math.min(100, (weekDoneCount / weekTotal) * 100)}%`,
                }}
              />
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-6">
          <StartWorkoutButton planDayId={todayDay.id} variant="primary" />
        </Reveal>

        <Reveal className="mt-3">
          <div className="block w-full overflow-hidden rounded-[22px] bg-bg-elevated p-5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-crimson" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                Сегодня
              </span>
            </div>
            <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
              {todayDay.title || 'Тренировка'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {muscles.slice(0, 5).map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                >
                  {MUSCLE_LABELS[m as MuscleGroup]}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[12px] text-text-tertiary tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Flame size={13} className="text-accent-crimson" />
                {todayDay.exercises.length} упражнений · {totalSets} подходов
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer size={13} /> ~{minutes} мин
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-3">
          <StartWorkoutButton planDayId={null} variant="secondary" />
        </Reveal>

        <WeekSchedule days={plan.days} />
      </>
    );
  }

  // -------- REST DAY (or no plan_day for today) --------
  const nextWorkout = plan.days
    .map((d) => ({ ...d, dist: ((d.weekday - weekday + 7) % 7) || 7 }))
    .filter((d) => !d.is_rest && d.exercises.length > 0)
    .sort((a, b) => a.dist - b.dist)[0];

  return (
    <>
      <Reveal className="flex items-baseline justify-end">
        <div className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-text-tertiary">
          Отдых
        </div>
      </Reveal>

      <Reveal className="mt-2">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01", "tnum"' }}
        >
          День отдыха
        </h1>
        <div className="mt-1 text-[14px] text-text-secondary">
          Восстановление — часть тренировки.
        </div>
      </Reveal>

      <Reveal className="mt-6 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-bg-elevated p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            <Flame size={12} className="text-accent-warning" /> Серия
          </div>
          <div className="mt-2 text-[24px] font-bold tabular-nums leading-none">
            {streak}
          </div>
          <div className="mt-1 text-[11px] text-text-tertiary">
            {streak === 0
              ? lastWorkoutDays !== null
                ? `${lastWorkoutDays} ${ruDaysWord(lastWorkoutDays)} назад`
                : 'Без тренировок'
              : `${ruDaysWord(streak)} подряд`}
          </div>
        </div>
        <div className="rounded-2xl bg-bg-elevated p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            На неделе
          </div>
          <div className="mt-2 flex items-baseline gap-1 tabular-nums">
            <span className="text-[24px] font-bold leading-none">
              {weekDoneCount}
            </span>
            <span className="text-[12px] text-text-tertiary">
              / {weekTotal}
            </span>
          </div>
          <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent-green"
              style={{
                width: `${Math.min(100, (weekDoneCount / weekTotal) * 100)}%`,
              }}
            />
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-6">
        <div className="text-[12px] text-text-tertiary">
          Сегодня день отдыха
        </div>
        <div className="mt-2">
          <StartWorkoutButton planDayId={null} variant="secondary" />
        </div>
      </Reveal>

      {nextWorkout && (
        <Reveal className="mt-3">
          <Link
            href={`/plan/edit/${nextWorkout.id}`}
            className="block w-full overflow-hidden rounded-[22px] bg-bg-elevated p-5 text-left active:scale-[0.995] transition-transform"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
              Следующая тренировка
            </div>
            <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
              {nextWorkout.title || 'Тренировка'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {planDayMuscles(nextWorkout).slice(0, 5).map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                >
                  {MUSCLE_LABELS[m]}
                </span>
              ))}
            </div>
          </Link>
        </Reveal>
      )}

      <WeekSchedule days={plan.days} />
    </>
  );
}
