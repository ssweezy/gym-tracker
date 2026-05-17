import type { MuscleGroup } from '@/lib/volume';

// Suggested precise sub-muscle tags per main group, offered as toggle chips
// when creating an exercise. The user can also add a free-text custom one.
export const SUBMUSCLES_BY_GROUP: Partial<Record<MuscleGroup, string[]>> = {
  chest: [
    'Грудь / верхняя часть',
    'Грудь / средняя часть',
    'Грудь / нижняя часть',
    'Грудь / внутренняя часть',
  ],
  back: [
    'Спина / широчайшие',
    'Спина / средняя часть',
    'Ромбовидные',
    'Спина / разгибатели',
    'Круглые мышцы',
  ],
  shoulders: [
    'Плечи / передняя дельта',
    'Плечи / средняя дельта',
    'Плечи / задняя дельта',
  ],
  biceps: [
    'Бицепс / короткая головка',
    'Бицепс / длинная головка',
    'Брахиалис',
    'Плечелучевая',
  ],
  triceps: [
    'Трицепс / длинная головка',
    'Трицепс / латеральная головка',
    'Трицепс / медиальная головка',
  ],
  forearms: [
    'Предплечья / сгибатели',
    'Предплечья / разгибатели',
    'Предплечья / хват',
  ],
  quads: [
    'Квадрицепс / прямая мышца',
    'Квадрицепс / медиальная широкая',
    'Квадрицепс / латеральная широкая',
  ],
  hamstrings: ['Бицепс бедра', 'Полусухожильная', 'Полуперепончатая'],
  glutes: ['Большая ягодичная', 'Средняя ягодичная', 'Малая ягодичная'],
  calves: ['Икры / икроножная мышца', 'Икры / камбаловидная мышца'],
  abs: [
    'Пресс / верхний отдел',
    'Пресс / нижний отдел',
    'Косые мышцы',
    'Поперечная мышца',
  ],
  traps: ['Верхняя трапеция', 'Средняя трапеция', 'Нижняя трапеция'],
};

/** Distinct sub-muscle suggestions for the currently selected groups. */
export function suggestedSubMuscles(groups: MuscleGroup[]): string[] {
  const out: string[] = [];
  for (const g of groups) {
    for (const s of SUBMUSCLES_BY_GROUP[g] ?? []) {
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}
