import type { Tables, TablesInsert } from '@/types/supabase';

export type ExerciseRow = Tables<'exercises'>;
export type SessionRow = Tables<'sessions'>;
export type SetRow = Tables<'sets'>;

export interface LogSetInput {
  session_id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  target_reps: number;
  is_first_set: boolean;
  reached_failure?: boolean;
  rpe?: number;
}

export type PlanPreset = 'fullbody3' | 'upper_lower' | 'split3';

export type PlanDayInsert = Omit<TablesInsert<'plan_days'>, 'plan_id'>;

export interface PlanPresetConfig {
  name: string;
  days: PlanDayInsert[];
}
