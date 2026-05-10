export type RepCategory = 'strength' | 'classic' | 'beginner';

export const REP_RANGES: Record<RepCategory, { low: number; high: number }> = {
  strength: { low: 5, high: 8 },
  classic: { low: 8, high: 12 },
  beginner: { low: 12, high: 15 },
};

export type SetHistoryEntry = {
  weight_kg: number;
  reps: number;
  target_reps: number;
  reached_failure: boolean | null;
  completed_at: Date;
};

export type Reasoning = 'first_time' | 'reps_up' | 'weight_up' | 'hold' | 'deload';

export type Suggestion = {
  weight_kg: number;
  target_reps: number;
  min_reps_followups: number;
  reasoning: Reasoning;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DELOAD_DAYS = 14;
const TOLERANCE = 3;
const DELOAD_FACTOR = 0.9;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function roundToHalfKg(weight: number): number {
  return Math.round(weight * 2) / 2;
}

function followupMin(target: number): number {
  return Math.max(1, target - TOLERANCE);
}

export function suggestNext(
  history: SetHistoryEntry[],
  category: RepCategory,
  exerciseIncrement: number = 2.5,
  now: Date = new Date(),
): Suggestion {
  const { low, high } = REP_RANGES[category];

  if (history.length === 0) {
    return {
      weight_kg: 0,
      target_reps: low,
      min_reps_followups: followupMin(low),
      reasoning: 'first_time',
    };
  }

  const last = history[0];
  const daysSince = daysBetween(last.completed_at, now);

  if (daysSince > DELOAD_DAYS) {
    return {
      weight_kg: roundToHalfKg(last.weight_kg * DELOAD_FACTOR),
      target_reps: low,
      min_reps_followups: followupMin(low),
      reasoning: 'deload',
    };
  }

  if (last.reps < last.target_reps) {
    return {
      weight_kg: last.weight_kg,
      target_reps: last.target_reps,
      min_reps_followups: followupMin(last.target_reps),
      reasoning: 'hold',
    };
  }

  if (last.target_reps >= high) {
    return {
      weight_kg: last.weight_kg + exerciseIncrement,
      target_reps: low,
      min_reps_followups: followupMin(low),
      reasoning: 'weight_up',
    };
  }

  return {
    weight_kg: last.weight_kg,
    target_reps: last.target_reps + 1,
    min_reps_followups: followupMin(last.target_reps + 1),
    reasoning: 'reps_up',
  };
}

export function validateFollowupSet(
  firstSetReps: number,
  currentReps: number,
): {
  ok: boolean;
  warning?: string;
} {
  if (currentReps >= firstSetReps - TOLERANCE) return { ok: true };
  return {
    ok: true,
    warning: `Падение более чем на ${TOLERANCE} повторений от первого подхода — возможно, рабочий вес слишком велик.`,
  };
}
