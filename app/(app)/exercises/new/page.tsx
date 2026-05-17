import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { listExercises } from '@/server/exercises';
import { NewExerciseForm, type LibraryExercise } from './form';

export default async function NewExercisePage() {
  // Curated system library — used to prefill the form by muscle so the user
  // doesn't have to type everything by hand.
  const all = await listExercises({});
  const library: LibraryExercise[] = all
    .filter((ex) => ex.is_system ?? true)
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      muscle_groups: ex.muscle_groups,
      sub_muscles:
        (ex as { sub_muscles?: string[] | null }).sub_muscles ?? null,
      increment_kg: ex.increment_kg ?? 2.5,
      description: ex.description ?? null,
      technique_tips: ex.technique_tips ?? null,
      historical_fact: ex.historical_fact ?? null,
    }));

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
      <Reveal className="mt-2">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          Новое упражнение
        </h1>
        <div className="mt-1 text-[13px] text-text-tertiary">
          Выберите из библиотеки по мышце или создайте своё
        </div>
      </Reveal>

      <Reveal className="mt-6 pb-2">
        <NewExerciseForm library={library} />
      </Reveal>
    </Stagger>
  );
}
