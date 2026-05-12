import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Trophy, Calendar, Layers, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getExerciseById } from '@/server/exercises';
import {
  getFirstSetsForExercise,
  getAllSetsForExerciseTotalsByWeek,
  getPersonalBest,
  getSessionsForExercise,
} from '@/server/sets';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { exerciseImageUrl } from '@/lib/exercise-images';
import { RU_MONTHS } from '@/lib/date';
import {
  WeightOverTimeChart,
  type WeightOverTimePoint,
} from '@/components/progress/WeightOverTimeChart';
import {
  WeeklyVolumeBarChart,
  type WeeklyVolumePoint,
} from '@/components/progress/WeeklyVolumeBarChart';

interface PageProps {
  params: Promise<{ exerciseId: string }>;
}

function formatRu(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
}

function formatShortDay(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

export default async function ExerciseProgressDetailPage({ params }: PageProps) {
  const { exerciseId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ex = await getExerciseById(exerciseId);
  if (!ex) notFound();

  const [firstSets, weeklyBuckets, personalBest, sessions] = await Promise.all([
    getFirstSetsForExercise(exerciseId),
    getAllSetsForExerciseTotalsByWeek(exerciseId),
    getPersonalBest(exerciseId),
    getSessionsForExercise(exerciseId),
  ]);

  const chartPoints: WeightOverTimePoint[] = firstSets.map((s) => ({
    x: s.completed_at,
    weight: s.weight_kg,
    reps: s.reps,
  }));

  const weeklyPoints: WeeklyVolumePoint[] = weeklyBuckets.map((w) => ({
    label: formatShortDay(w.weekStart),
    volume: w.tonnage,
  }));

  const lastSet = firstSets.at(-1) ?? null;
  const totalSets = sessions.reduce((sum, s) => sum + s.setCount, 0);

  const heroImg = (ex.is_system ?? true) ? exerciseImageUrl(ex.name) : null;

  interface StatTile {
    icon: typeof Activity;
    label: 'Текущий' | 'Рекорд' | 'Подходов';
    value: string;
    reps: number | null;
    sub: string;
    valueColor: string;
    iconColor: string;
    dot: string;
    topBar?: string;
  }

  const stats: StatTile[] = [
    {
      icon: Activity,
      label: 'Текущий',
      value: lastSet ? lastSet.weight_kg.toString().replace('.', ',') : '—',
      reps: lastSet ? lastSet.reps : null,
      sub: lastSet ? '' : 'нет данных',
      valueColor: 'text-accent-green',
      iconColor: 'text-accent-green',
      dot: '#34C759',
    },
    {
      icon: Trophy,
      label: 'Рекорд',
      value: personalBest
        ? personalBest.weight_kg.toString().replace('.', ',')
        : '—',
      reps: personalBest ? personalBest.reps : null,
      sub: personalBest ? '' : 'нет данных',
      valueColor: 'text-accent-warning',
      iconColor: 'text-accent-warning',
      dot: '#FF9500',
    },
    {
      icon: Layers,
      label: 'Подходов',
      value: String(totalSets),
      reps: null,
      sub: `за ${sessions.length} ${sessions.length === 1 ? 'тренировку' : sessions.length < 5 ? 'тренировки' : 'тренировок'}`,
      valueColor: 'text-text-primary',
      iconColor: 'text-accent-crimson',
      dot: '#FF2D55',
      topBar: 'bg-accent-crimson',
    },
  ];

  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <Link
          href="/progress"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary active:text-text-secondary"
        >
          <ArrowLeft size={14} /> Прогресс
        </Link>
      </Reveal>

      <Reveal className="mt-5">
        {heroImg ? (
          <div
            className="relative w-full overflow-hidden rounded-[22px] bg-white/[0.04]"
            style={{ aspectRatio: '16/7' }}
          >
            <Image
              src={heroImg}
              alt={ex.name}
              fill
              sizes="100vw"
              priority
              unoptimized
              className="object-cover"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
              style={{
                background:
                  'linear-gradient(180deg, rgba(11,11,14,0) 0%, rgba(11,11,14,0.9) 100%)',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h1 className="text-[24px] font-bold leading-tight tracking-tight text-white">
                {ex.name}
              </h1>
            </div>
          </div>
        ) : (
          <h1
            className="text-[28px] font-bold leading-tight tracking-tight"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            {ex.name}
          </h1>
        )}
      </Reveal>

      <Reveal className="mt-5">
        <div className="grid grid-cols-3 gap-2">
          {stats.map(
            ({
              icon: Icon,
              label,
              value,
              reps,
              sub,
              valueColor,
              iconColor,
              dot,
              topBar,
            }) => (
              <div
                key={label}
                className="relative overflow-hidden rounded-[20px] bg-bg-elevated p-3.5"
              >
                {topBar && (
                  <span
                    className={`absolute inset-x-0 top-0 h-[2px] ${topBar}`}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className={iconColor} strokeWidth={2.4} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    {label}
                  </span>
                </div>
                <div
                  className="mt-2 flex items-baseline gap-0.5 tabular-nums"
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  <span
                    className={`text-[22px] font-bold leading-none tracking-tight ${valueColor}`}
                  >
                    {value}
                  </span>
                  {(label === 'Текущий' || label === 'Рекорд') &&
                    value !== '—' && (
                      <span className="text-[11px] text-text-tertiary">
                        кг
                      </span>
                    )}
                </div>
                <div className="mt-1 text-[10.5px] text-text-tertiary tabular-nums">
                  {reps !== null && value !== '—' ? (
                    <>
                      ×{' '}
                      <span className={valueColor}>{reps}</span>{' '}
                      <span className="text-text-tertiary">повт.</span>
                    </>
                  ) : (
                    sub
                  )}
                </div>
                <span
                  className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: dot,
                    boxShadow: `0 0 8px 0 ${dot}88`,
                  }}
                />
              </div>
            ),
          )}
        </div>
      </Reveal>

      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Рабочий вес
        </h2>
        <span className="text-[11px] text-text-tertiary">первый подход</span>
      </Reveal>

      <Reveal className="mt-3">
        <div
          className="overflow-hidden rounded-[22px] p-4"
          style={{
            background:
              'radial-gradient(120% 80% at 100% 0%, rgba(52,199,89,0.08) 0%, rgba(52,199,89,0) 60%), #131316',
          }}
        >
          <WeightOverTimeChart points={chartPoints} />
        </div>
      </Reveal>

      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Недельный объём
        </h2>
        <span className="text-[11px] text-text-tertiary">12 недель</span>
      </Reveal>

      <Reveal className="mt-3">
        <div
          className="overflow-hidden rounded-[22px] p-4"
          style={{
            background:
              'radial-gradient(120% 80% at 100% 0%, rgba(52,199,89,0.06) 0%, rgba(52,199,89,0) 60%), #131316',
          }}
        >
          <WeeklyVolumeBarChart weeks={weeklyPoints} />
        </div>
      </Reveal>

      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <Calendar size={13} strokeWidth={2.4} />
          История
        </h2>
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {sessions.length}
        </span>
      </Reveal>

      <Reveal className="mt-3 pb-2">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          {sessions.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              Пока нет тренировок с этим упражнением.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {sessions.slice(0, 20).map((s) => {
                const ts = s.finished_at ?? s.started_at;
                const d = new Date(ts);
                return (
                  <li key={s.session_id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold leading-tight tabular-nums">
                          {formatRu(d)}
                        </div>
                        <div className="mt-1 text-[11.5px] text-text-tertiary tabular-nums">
                          {s.setCount}{' '}
                          {s.setCount === 1
                            ? 'подход'
                            : s.setCount < 5
                              ? 'подхода'
                              : 'подходов'}
                        </div>
                      </div>
                      <div
                        className="text-right tabular-nums"
                        style={{ fontFeatureSettings: '"tnum"' }}
                      >
                        <span className="text-[15px] font-semibold leading-none text-accent-green">
                          {s.topReps}
                        </span>
                        <span className="ml-0.5 text-[11px] text-text-tertiary">
                          повт.
                        </span>
                        <span className="mx-1 text-[11px] text-text-tertiary">
                          ×
                        </span>
                        <span className="text-[15px] font-semibold leading-none">
                          {s.topWeight.toString().replace('.', ',')}
                        </span>
                        <span className="ml-0.5 text-[11px] text-text-tertiary">
                          кг
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Reveal>
    </Stagger>
  );
}
