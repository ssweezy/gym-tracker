import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BackLink } from '@/components/nav/back';
import { getPlanDay } from '@/server/plans';
import { listExercises } from '@/server/exercises';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { DayEditor } from './editor';

interface PageProps {
  params: Promise<{ dayId: string }>;
}

const WEEKDAY_LONG = [
  '',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export default async function PlanEditPage({ params }: PageProps) {
  const { dayId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const day = await getPlanDay(dayId);
  if (!day) notFound();

  const exercises = await listExercises({});

  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <BackLink fallback="/plan" label="План" />
      </Reveal>

      <Reveal className="mt-2">
        <div className="text-[13px] font-medium text-text-tertiary">
          {WEEKDAY_LONG[day.weekday]}
        </div>
        <h1
          className="mt-1 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          {day.is_rest ? 'Отдых' : day.title || 'Тренировка'}
        </h1>
      </Reveal>

      <Reveal className="mt-6 pb-2">
        <DayEditor
          dayId={day.id}
          isRest={day.is_rest}
          exercises={day.exercises.map((pe) => ({
            id: pe.id,
            exercise_id: pe.exercise_id,
            name: pe.exercise.name,
            muscle_groups: pe.exercise.muscle_groups,
            rep_category: pe.rep_category,
            target_sets: pe.target_sets,
            is_system: pe.exercise.is_system ?? true,
          }))}
          allExercises={exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            muscle_groups: ex.muscle_groups,
            is_system: ex.is_system ?? true,
          }))}
        />
      </Reveal>
    </Stagger>
  );
}
