// Hardcoded mapping of Russian exercise names → yuhonas/free-exercise-db folder slugs.
// Image asset is served at `<BASE>/<slug>/0.jpg`.
// Slugs verified against https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
// (873 exercises in the DB as of fetch).
const SLUG_BY_NAME: Record<string, string> = {
  'Жим лёжа': 'Barbell_Bench_Press_-_Medium_Grip',
  'Присед со штангой': 'Barbell_Squat',
  'Становая тяга': 'Barbell_Deadlift',
  'Жим стоя со штангой': 'Standing_Military_Press',
  'Тяга штанги в наклоне': 'Bent_Over_Barbell_Row',
  'Подтягивания': 'Pullups',
  'Отжимания на брусьях': 'Dips_-_Triceps_Version',
  'Сгибания на бицепс со штангой': 'Barbell_Curl',
  'Французский жим лёжа': 'EZ-Bar_Skullcrusher',
  'Жим ногами в тренажёре': 'Leg_Press',
  'Разгибания ног в тренажёре': 'Leg_Extensions',
  'Сгибания ног лёжа': 'Lying_Leg_Curls',
  'Румынская тяга': 'Romanian_Deadlift',
  'Гиперэкстензия': 'Hyperextensions_Back_Extensions',
  'Армейский жим гантелей': 'Seated_Dumbbell_Press',
  'Разводка гантелей в наклоне': 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench',
  'Тяга гантели в наклоне': 'One-Arm_Dumbbell_Row',
  'Молотки на бицепс': 'Hammer_Curls',
  'Разгибания на трицепс на блоке': 'Triceps_Pushdown',
  'Подъёмы на носки стоя': 'Standing_Calf_Raises',
  'Скручивания': 'Crunches',
  'Планка': 'Plank',
  'Подъём ног в висе': 'Hanging_Leg_Raise',
  'Тяга верхнего блока': 'Wide-Grip_Lat_Pulldown',
  'Горизонтальная тяга в блоке': 'Seated_Cable_Rows',
};

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

export function exerciseImageUrl(name: string): string | null {
  const slug = SLUG_BY_NAME[name];
  return slug ? `${BASE}/${slug}/0.jpg` : null;
}
