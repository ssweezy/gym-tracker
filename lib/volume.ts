export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'traps'
  | 'cardio';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  quads: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  glutes: 'Ягодицы',
  calves: 'Икры',
  abs: 'Пресс',
  traps: 'Трапеции',
  cardio: 'Кардио',
};

export type VolumeStatus = 'under' | 'optimal' | 'over';

const OPTIMAL_LOW = 4;
const OPTIMAL_HIGH = 10;

type VolumeExercise = {
  exercise: { muscle_groups: MuscleGroup[] };
  target_sets: number;
};

type VolumeDay = {
  is_rest?: boolean;
  exercises: VolumeExercise[];
};

export function computeWeeklyVolume(
  planDays: VolumeDay[],
): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};
  for (const day of planDays) {
    if (day.is_rest) continue;
    for (const pe of day.exercises) {
      for (const muscle of pe.exercise.muscle_groups) {
        totals[muscle] = (totals[muscle] ?? 0) + pe.target_sets;
      }
    }
  }
  return totals;
}

export function statusFor(group: MuscleGroup, sets: number): VolumeStatus {
  if (group === 'cardio') return 'optimal';
  if (sets < OPTIMAL_LOW) return 'under';
  if (sets > OPTIMAL_HIGH) return 'over';
  return 'optimal';
}
