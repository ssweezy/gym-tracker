import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { NewExerciseForm } from './form';

export default function NewExercisePage() {
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
          Создайте своё упражнение для плана
        </div>
      </Reveal>

      <Reveal className="mt-6 pb-2">
        <NewExerciseForm />
      </Reveal>
    </Stagger>
  );
}
