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

/**
 * Per-session ad-hoc state stored in `sessions.meta` (jsonb). Keyed by
 * `plan_exercises.id` (stable for the life of the plan day).
 */
export interface SessionMeta {
  /** plan_exercise ids the user marked "не выполнено". */
  skipped?: string[];
  /** plan_exercise id → user-overridden target set count for this session. */
  setOverrides?: Record<string, number>;
}

export interface WorkoutHistoryItem {
  id: string;
  started_at: string;
  finished_at: string;
  duration_min: number;
  title: string;
  set_count: number;
  tonnage_kg: number;
  /** Distinct exercise names performed in this session. */
  exercises: string[];
}

export interface SeasonSummary {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  workout_count: number;
}

export interface WorkoutDetailSet {
  weight_kg: number;
  reps: number;
  is_first_set: boolean;
}

export interface WorkoutDetailExercise {
  exercise_id: string;
  name: string;
  sets: WorkoutDetailSet[];
}

export interface WorkoutDetail {
  id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
  duration_min: number;
  set_count: number;
  tonnage_kg: number;
  exercises: WorkoutDetailExercise[];
}

export type PlanPreset = 'fullbody3' | 'upper_lower' | 'split3';

export type PlanDayInsert = Omit<TablesInsert<'plan_days'>, 'plan_id'>;

export interface PlanPresetConfig {
  name: string;
  days: PlanDayInsert[];
}
