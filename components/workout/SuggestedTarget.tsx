'use client';

import { Sparkles } from 'lucide-react';
import type { Suggestion, Reasoning } from '@/lib/progression';

const REASONING_HINTS: Record<Reasoning, string> = {
  first_time: 'Старт',
  reps_up: '+1 повторение',
  weight_up: '+вес',
  hold: 'Удержать',
  deload: 'Разгрузка',
};

export interface SuggestedTargetData {
  suggestion: Suggestion;
  last?: {
    weight_kg: number;
    reps: number;
  };
}

export function SuggestedTarget({ data }: { data: SuggestedTargetData }) {
  const hint = REASONING_HINTS[data.suggestion.reasoning];
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background:
          'radial-gradient(90% 120% at 0% 0%, rgba(52,199,89,0.10) 0%, rgba(52,199,89,0) 60%), #141417',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
          Цель
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-green">
          <Sparkles size={11} /> {hint}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2 tabular-nums">
        <span className="text-[40px] font-bold leading-none tracking-tight text-accent-green">
          {data.suggestion.target_reps}
        </span>
        <span className="text-base text-text-secondary">повт.</span>
        <span className="mx-1 text-2xl text-text-tertiary">×</span>
        <span className="text-[40px] font-bold leading-none tracking-tight">
          {data.suggestion.weight_kg.toFixed(data.suggestion.weight_kg % 1 === 0 ? 0 : 1)}
        </span>
        <span className="text-base text-text-secondary">кг</span>
      </div>
      <div className="mt-2 text-[11.5px] text-text-tertiary tabular-nums">
        {data.last
          ? `В прошлый раз: ${data.last.reps} × ${data.last.weight_kg} кг`
          : 'Первая тренировка для этого упражнения'}
      </div>
    </div>
  );
}
