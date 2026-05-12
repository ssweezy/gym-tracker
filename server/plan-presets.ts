import type { PlanDayInsert, PlanPreset, PlanPresetConfig } from './types';

/**
 * Source of truth for preset plan layouts shared between
 * `applyPreset` (now create-and-activate) and `createPlanFromPreset`.
 * Kept in a non-`'use server'` module so both the action layer and
 * client code can read the labels/values without violating the
 * server-action export contract.
 */
export const PLAN_PRESETS: Record<PlanPreset, PlanPresetConfig> = {
  fullbody3: {
    name: 'Фуллбоди · 3 раза в неделю',
    days: [
      { weekday: 1, order_idx: 0, is_rest: false, title: 'Фуллбоди A' },
      { weekday: 2, order_idx: 1, is_rest: true, title: 'Отдых' },
      { weekday: 3, order_idx: 2, is_rest: false, title: 'Фуллбоди B' },
      { weekday: 4, order_idx: 3, is_rest: true, title: 'Отдых' },
      { weekday: 5, order_idx: 4, is_rest: false, title: 'Фуллбоди C' },
      { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
      { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
    ],
  },
  upper_lower: {
    name: 'Сплит · Верх / Низ',
    days: [
      { weekday: 1, order_idx: 0, is_rest: false, title: 'Верх' },
      { weekday: 2, order_idx: 1, is_rest: false, title: 'Низ' },
      { weekday: 3, order_idx: 2, is_rest: true, title: 'Отдых' },
      { weekday: 4, order_idx: 3, is_rest: false, title: 'Верх' },
      { weekday: 5, order_idx: 4, is_rest: false, title: 'Низ' },
      { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
      { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
    ],
  },
  split3: {
    name: 'Сплит · Грудь+Трицепс / Спина+Бицепс / Ноги',
    days: [
      { weekday: 1, order_idx: 0, is_rest: false, title: 'Грудь · Трицепс' },
      { weekday: 2, order_idx: 1, is_rest: true, title: 'Отдых' },
      { weekday: 3, order_idx: 2, is_rest: false, title: 'Спина · Бицепс' },
      { weekday: 4, order_idx: 3, is_rest: true, title: 'Отдых' },
      { weekday: 5, order_idx: 4, is_rest: false, title: 'Ноги' },
      { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
      { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
    ],
  },
};

export const EMPTY_PLAN_DAYS: PlanDayInsert[] = [
  { weekday: 1, order_idx: 0, is_rest: true, title: 'Отдых' },
  { weekday: 2, order_idx: 1, is_rest: true, title: 'Отдых' },
  { weekday: 3, order_idx: 2, is_rest: true, title: 'Отдых' },
  { weekday: 4, order_idx: 3, is_rest: true, title: 'Отдых' },
  { weekday: 5, order_idx: 4, is_rest: true, title: 'Отдых' },
  { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
  { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
];

export const HIDDEN_PLAN_NAME = '__extra__';
