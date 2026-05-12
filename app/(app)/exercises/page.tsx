import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listExercises, getExerciseIdsInActivePlan } from '@/server/exercises';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { ExerciseAvatar } from '@/components/exercises/ExerciseAvatar';
import { ExerciseSearchBar } from '@/components/exercises/ExerciseSearchBar';
import {
  MuscleFilterChips,
  type FilterChip,
} from '@/components/exercises/MuscleFilterChips';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { getExerciseMuscleLabels } from '@/lib/exercise-muscles';
import { exerciseImageUrl } from '@/lib/exercise-images';
import { muscleHue } from '@/components/exercises/MuscleGroupBadge';

interface PageProps {
  searchParams: Promise<{ q?: string; muscle?: string }>;
}

const FILTER_ORDER: MuscleGroup[] = [
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

export default async function ExercisesPage({ searchParams }: PageProps) {
  const { q, muscle } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [exercises, inPlanIds, allForCounts] = await Promise.all([
    listExercises({ search: q, muscle }),
    getExerciseIdsInActivePlan(user.id),
    listExercises({}),
  ]);

  const counts: Record<string, number> = { '': allForCounts.length };
  for (const m of FILTER_ORDER) counts[m] = 0;
  for (const ex of allForCounts) {
    for (const m of ex.muscle_groups) {
      if (counts[m] !== undefined) counts[m] += 1;
    }
  }

  const chips: FilterChip[] = [
    { key: '', label: 'Все', count: counts[''] },
    ...FILTER_ORDER.filter((m) => counts[m] > 0).map((m) => ({
      key: m,
      label: MUSCLE_LABELS[m],
      count: counts[m],
    })),
  ];

  const inPlan = exercises.filter((ex) => inPlanIds.has(ex.id));
  const inPlanTotal = exercises.length;

  return (
    <Stagger className="pt-9">
      <Reveal className="px-5">
        <div className="flex items-baseline justify-between">
          <div className="text-[13px] font-medium text-text-tertiary tabular-nums">
            {inPlanTotal} упражнений · {inPlan.length} в плане
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            Тренажёры
          </h1>
          <Link
            href="/exercises/new"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black active:scale-95 transition-transform"
            aria-label="Создать упражнение"
            style={{
              background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
              boxShadow: '0 6px 18px -6px rgba(52,199,89,0.55)',
            }}
          >
            <Plus size={20} strokeWidth={2.6} />
          </Link>
        </div>
      </Reveal>

      <Reveal className="mt-5 px-5">
        <ExerciseSearchBar initial={q ?? ''} />
      </Reveal>

      <Reveal className="mt-4">
        <MuscleFilterChips chips={chips} />
      </Reveal>

      {inPlan.length > 0 && (
        <Reveal className="mt-7">
          <div className="flex items-baseline justify-between px-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              В твоём плане
            </h2>
            <span className="text-[12px] text-text-tertiary">
              {inPlan.length} упражнений
            </span>
          </div>
          <div className="mt-3 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2.5">
              {inPlan.map((ex) => {
                const img = (ex.is_system ?? true) ? exerciseImageUrl(ex.name) : null;
                const hue = muscleHue(ex.muscle_groups[0] ?? 'chest');
                return (
                  <Link
                    key={ex.id}
                    href={`/exercises/${ex.id}`}
                    className="w-[180px] shrink-0 overflow-hidden rounded-[22px] bg-bg-elevated text-left active:scale-[0.985] transition-transform"
                  >
                    {img ? (
                      <div className="relative h-[120px] w-full overflow-hidden bg-white/[0.04]">
                        <Image
                          src={img}
                          alt={ex.name}
                          fill
                          sizes="160px"
                          className="object-cover"
                          unoptimized
                        />
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-green" />
                      </div>
                    ) : (
                      <div
                        className="relative flex h-[120px] w-full items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, hsla(${hue}, 70%, 35%, 0.45) 0%, hsla(${hue + 20}, 80%, 25%, 0.55) 100%)`,
                        }}
                      >
                        <ExerciseAvatar
                          name={ex.name}
                          muscleGroups={ex.muscle_groups}
                          isSystem={ex.is_system ?? true}
                          size={48}
                        />
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-green" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-[15px] font-semibold leading-tight tracking-tight line-clamp-2 min-h-[2.5em]">
                        {ex.name}
                      </h3>
                      <div className="mt-2 text-[11px] text-text-tertiary truncate">
                        {getExerciseMuscleLabels(ex.name, ex.muscle_groups).join(' · ')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal className="mt-5 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            Все упражнения
          </h2>
          <span className="text-[12px] text-text-tertiary tabular-nums">А–Я</span>
        </div>
      </Reveal>

      <Reveal className="mt-3 px-5 pb-2">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          {exercises.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              Ничего не найдено
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <Link
                    href={`/exercises/${ex.id}`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03] transition-colors"
                  >
                    <ExerciseAvatar
                      name={ex.name}
                      muscleGroups={ex.muscle_groups}
                      isSystem={ex.is_system ?? true}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                          {ex.name}
                        </h3>
                        {inPlanIds.has(ex.id) && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green"
                            aria-label="В активном плане"
                          />
                        )}
                        {!(ex.is_system ?? true) && (
                          <span className="rounded-full bg-accent-crimson/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-accent-crimson">
                            Моё
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-text-tertiary truncate">
                        {getExerciseMuscleLabels(ex.name, ex.muscle_groups).join(' · ')}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-tertiary shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </Stagger>
  );
}
