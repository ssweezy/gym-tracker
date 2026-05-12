import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, History, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getExerciseById } from '@/server/exercises';
import { getActivePlan } from '@/server/plans';
import { getPersonalBest } from '@/server/sets';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { ExerciseAvatar } from '@/components/exercises/ExerciseAvatar';
import {
  MuscleGroupBadge,
  muscleHue,
} from '@/components/exercises/MuscleGroupBadge';
import {
  AddToPlanSheet,
  type AddToPlanDayOption,
} from '@/components/exercises/AddToPlanSheet';
import { DeleteExerciseButton } from '@/components/exercises/DeleteExerciseButton';
import { exerciseImageUrl } from '@/lib/exercise-images';
import { getExerciseMuscleLabels } from '@/lib/exercise-muscles';
import { RU_MONTHS } from '@/lib/date';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExerciseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // All three are independent and can fan out in parallel.
  const [ex, plan, personalBest] = await Promise.all([
    getExerciseById(id),
    getActivePlan(user.id),
    getPersonalBest(id),
  ]);
  if (!ex) notFound();

  const dayOptions: AddToPlanDayOption[] = (plan?.days ?? []).map((d) => ({
    id: d.id,
    weekday: d.weekday,
    title: d.title,
    is_rest: d.is_rest,
  }));

  const isSystem = ex.is_system ?? true;
  const heroImg = isSystem ? exerciseImageUrl(ex.name) : null;
  const heroHue = muscleHue(ex.muscle_groups[0] ?? 'chest');

  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary active:text-text-secondary"
        >
          <ArrowLeft size={14} /> Тренажёры
        </Link>
      </Reveal>

      <Reveal className="mt-5">
        {heroImg ? (
          <div className="relative w-full overflow-hidden rounded-[26px] bg-white/[0.04]" style={{ aspectRatio: '4/3' }}>
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
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background:
                  'linear-gradient(180deg, rgba(11,11,14,0) 0%, rgba(11,11,14,0.85) 100%)',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h1 className="text-[24px] font-bold leading-tight tracking-tight text-white">
                {ex.name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ex.muscle_groups.map((m) => (
                  <MuscleGroupBadge key={m} group={m} />
                ))}
              </div>
              <div className="mt-2 text-[12px] text-white/70 tabular-nums">
                Шаг веса: {(ex.increment_kg ?? 2.5).toFixed(1)} кг
              </div>
            </div>
          </div>
        ) : (
          <div
            className="relative w-full overflow-hidden rounded-[26px] p-5"
            style={{
              aspectRatio: '4/3',
              background: `radial-gradient(120% 90% at 0% 0%, hsla(${heroHue}, 70%, 45%, 0.30) 0%, hsla(${heroHue + 20}, 70%, 25%, 0.10) 55%), linear-gradient(180deg, #131316 0%, #0B0B0E 100%)`,
            }}
          >
            <div className="flex h-full flex-col justify-end">
              <ExerciseAvatar
                name={ex.name}
                muscleGroups={ex.muscle_groups}
                isSystem={isSystem}
                size={64}
              />
              <h1 className="mt-4 text-[24px] font-bold leading-tight tracking-tight">
                {ex.name}
              </h1>
              {!isSystem && (
                <span className="mt-1 inline-block self-start rounded-full bg-accent-crimson/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-accent-crimson">
                  Моё
                </span>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ex.muscle_groups.map((m) => (
                  <MuscleGroupBadge key={m} group={m} />
                ))}
              </div>
              <div className="mt-3 text-[12px] text-text-tertiary tabular-nums">
                Шаг веса: {(ex.increment_kg ?? 2.5).toFixed(1)} кг
              </div>
            </div>
          </div>
        )}
      </Reveal>

      {ex.description && (
        <Reveal className="mt-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            Описание
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            {ex.description}
          </p>
        </Reveal>
      )}

      <Reveal className="mt-6">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <Trophy size={13} className="text-accent-warning" strokeWidth={2.4} />
          Личный рекорд
        </h2>
        {personalBest ? (
          <div
            className="mt-3 overflow-hidden rounded-[22px] p-5"
            style={{
              background:
                'radial-gradient(120% 90% at 100% 0%, rgba(255,149,0,0.10) 0%, rgba(255,149,0,0) 55%), #131316',
            }}
          >
            <div
              className="flex items-baseline gap-2 tabular-nums"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              <span className="text-[40px] font-bold leading-none tracking-tight text-accent-warning">
                {personalBest.reps}
              </span>
              <span className="text-base text-text-secondary">повт.</span>
              <span className="mx-1 text-2xl text-text-tertiary">×</span>
              <span className="text-[40px] font-bold leading-none tracking-tight">
                {personalBest.weight_kg.toString().replace('.', ',')}
              </span>
              <span className="text-base text-text-secondary">кг</span>
            </div>
            <div className="mt-2 text-[12px] text-text-tertiary">
              {(() => {
                const d = new Date(personalBest.completed_at);
                return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
              })()}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[13.5px] text-text-tertiary">
            Ещё не было подходов
          </p>
        )}
      </Reveal>

      <Reveal className="mt-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Целевые мышцы
        </h2>
        <ul className="mt-3 space-y-1.5">
          {getExerciseMuscleLabels(ex.name, ex.muscle_groups).map((label) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-xl bg-white/[0.025] px-3.5 py-2.5"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-crimson" />
              <span className="text-[13.5px] text-text-primary">{label}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      {ex.technique_tips && ex.technique_tips.length > 0 && (
        <Reveal className="mt-6">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <BookOpen size={13} /> Техника
          </h2>
          <ol className="mt-3 space-y-2">
            {ex.technique_tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl bg-white/[0.025] px-4 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-green/15 text-[12px] font-semibold tabular-nums text-accent-green">
                  {i + 1}
                </span>
                <span className="text-[14px] leading-relaxed text-text-primary">
                  {tip}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      )}

      {ex.historical_fact && (
        <Reveal className="mt-6">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <History size={13} /> История
          </h2>
          <div
            className="mt-3 overflow-hidden rounded-[22px] p-5"
            style={{
              background:
                'radial-gradient(120% 90% at 100% 0%, rgba(255,149,0,0.10) 0%, rgba(255,149,0,0) 55%), #131316',
            }}
          >
            <div className="text-[40px] leading-none text-accent-warning/70">“</div>
            <p className="-mt-3 text-[14px] leading-relaxed text-text-secondary italic">
              {ex.historical_fact}
            </p>
          </div>
        </Reveal>
      )}

      <Reveal className="mt-7">
        <AddToPlanSheet
          exerciseId={ex.id}
          exerciseName={ex.name}
          days={dayOptions}
        />
      </Reveal>

      {!isSystem && (
        <Reveal className="mt-3 pb-2">
          <DeleteExerciseButton exerciseId={ex.id} exerciseName={ex.name} />
        </Reveal>
      )}
    </Stagger>
  );
}
