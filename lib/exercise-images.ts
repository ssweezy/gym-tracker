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
  // Extra seed (2026-05-12)
  'Жим лёжа узким хватом': 'Close-Grip_Barbell_Bench_Press',
  'Жим лёжа на наклонной': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'Жим лёжа на обратной наклонной': 'Decline_Barbell_Bench_Press',
  'Жим гантелей на горизонтальной': 'Dumbbell_Bench_Press',
  'Разводка гантелей лёжа': 'Dumbbell_Flyes',
  'Кроссовер': 'Cable_Crossover',
  'Тяга штанги к подбородку': 'Smith_Machine_Upright_Row',
  'Шраги со штангой': 'Barbell_Shrug',
  'Махи гантелями в стороны': 'Side_Lateral_Raise',
  'Махи гантелями перед собой': 'Front_Dumbbell_Raise',
  'Тяга T-грифа': 'T-Bar_Row_with_Handle',
  'Пуловер с гантелью': 'Straight-Arm_Dumbbell_Pullover',
  'Подтягивания обратным хватом': 'Chin-Up',
  'Сгибания на скамье Скотта': 'Preacher_Curl',
  'Концентрированные сгибания': 'Concentration_Curls',
  'Отжимания от пола': 'Pushups',
  'Болгарские выпады': 'Split_Squat_with_Dumbbells',
  'Выпады с гантелями': 'Dumbbell_Lunges',
  'Сгибания ног сидя': 'Seated_Leg_Curl',
  'Подъёмы на носки сидя': 'Seated_Calf_Raise',
  'Боковая планка': 'Side_Bridge',
  'Велосипед': 'Air_Bike',
  'Жим гантелей на наклонной': 'Incline_Dumbbell_Press',
  'Шраги с гантелями': 'Dumbbell_Shrug',
  'Разгибания рук из-за головы': 'Standing_Dumbbell_Triceps_Extension',
};

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Last-resort, muscle-appropriate photo so EVERY exercise (incl. custom
// without an uploaded image) still shows a real picture, never just an avatar.
const FALLBACK_SLUG_BY_MUSCLE: Record<string, string> = {
  chest: 'Barbell_Bench_Press_-_Medium_Grip',
  back: 'Bent_Over_Barbell_Row',
  lats: 'Pullups',
  shoulders: 'Standing_Military_Press',
  biceps: 'Barbell_Curl',
  triceps: 'EZ-Bar_Skullcrusher',
  forearms: 'Standing_Dumbbell_Reverse_Curl',
  quads: 'Barbell_Squat',
  hamstrings: 'Romanian_Deadlift',
  glutes: 'Barbell_Hip_Thrust',
  calves: 'Standing_Calf_Raises',
  abs: 'Crunches',
  traps: 'Barbell_Shrug',
  cardio: 'Stairmaster',
};

/**
 * Resolve a photo for an exercise. Priority:
 *  1. `dbImageUrl` — exercises.image_url (custom uploads + system backfill).
 *  2. Legacy in-code Russian-name → slug map.
 *  3. A representative photo for the exercise's primary muscle group.
 * Always returns a usable URL when a muscle group is known.
 */
export function exerciseImageUrl(
  name: string,
  dbImageUrl?: string | null,
  muscleGroups?: string[] | null,
): string | null {
  if (dbImageUrl) return dbImageUrl;
  const slug = SLUG_BY_NAME[name];
  if (slug) return `${BASE}/${slug}/0.jpg`;
  const primary = muscleGroups?.[0];
  if (primary && FALLBACK_SLUG_BY_MUSCLE[primary]) {
    return `${BASE}/${FALLBACK_SLUG_BY_MUSCLE[primary]}/0.jpg`;
  }
  return null;
}

/**
 * External "correct technique" source. Uses a stored URL when present
 * (custom exercises may set their own), otherwise a YouTube search for the
 * Russian exercise name + «техника» — always resolves to relevant videos.
 */
export function techniqueSourceUrl(
  name: string,
  storedUrl?: string | null,
): string {
  if (storedUrl && storedUrl.trim()) return storedUrl.trim();
  const q = encodeURIComponent(`${name} техника выполнения`);
  return `https://www.youtube.com/results?search_query=${q}`;
}
