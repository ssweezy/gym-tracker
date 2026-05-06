# Gym Tracker — Design Spec

**Дата:** 2026-05-06
**Статус:** проект (нулевая итерация)
**Цель:** персональный фитнес-дневник — записывать вес × повторы по упражнениям, видеть прогресс, планировать неделю.

---

## 1. Цели и не-цели

### Цели MVP
- Аутентификация (email + Google OAuth)
- Каталог упражнений + добавление пользовательских
- Detail-экран упражнения (описание, техника, исторический факт)
- Запись подходов (вес × повторы) во время тренировки
- Категории повторений на каждое упражнение в плане: **силовая 5–8**, **классика 8–12**, **новичок 12–15**
- Конструктор недельного плана (ПН–ВС) с подсчётом **недельного объёма по группам мышц** (4–10 подходов в неделю на группу)
- Экран «Сегодня» — что нужно сделать по плану на текущий день
- Прогресс по дням и по упражнениям (графики + шкала засечек)
- **Двойная прогрессия** (повторы → вес): локальный алгоритм подсказывает целевой вес и число повторов
- Контроль «технического отказа на первом подходе» + tolerance ±3 повтора для последующих подходов
- Таймер отдыха между подходами
- PWA (установка на главный экран, офлайн-запись подходов)
- Mobile-first дизайн в стиле Apple Fitness (тёмные тона, акценты)

### Не-цели MVP
- Push-уведомления (настраиваются позже через Web Push)
- Социальные функции (друзья, лайки)
- LLM-подсказки веса (отказались в пользу локального алгоритма)
- Видео-демонстрации упражнений
- Импорт из Apple Health / Google Fit
- Подписочная модель / монетизация
- Нативное мобильное приложение (App Store / Google Play — отдельный проект, переписывается позже)
- Локализация (архитектура i18n-ready, переводы добавляются по запросу)

---

## 2. Стек

| Слой | Технология | Обоснование |
|---|---|---|
| Фронтенд-фреймворк | **Next.js 15** (App Router) + TypeScript | Production-grade, server components, server actions, легко деплоится на Vercel |
| Стили | **Tailwind CSS** | Соответствует дизайну скриншотов референсов, скорость прототипирования |
| Анимации | **Framer Motion** | Apple-стайл переходов, жесты |
| База + Auth | **Supabase** (Free tier) | PostgreSQL + Auth + Storage, RLS защищает пользовательские данные на уровне БД |
| Хостинг | **Vercel** (Free tier) | Родной для Next.js, SSL и домен из коробки |
| Графики | **Recharts** | Хорошо интегрируется с темами Tailwind |
| Иконки | **Lucide React** + кастомные SVG | Тонкие линии в стиле Apple |
| Тесты | **Vitest** (unit) + **Playwright** (E2E) | Стандарт экосистемы |
| PWA | **next-pwa** + Workbox | Service worker, офлайн-кэширование, фоновая синхронизация |
| Валидация | **Zod** | Server actions + формы |
| Тосты | **sonner** | Apple-подобные уведомления |
| Состояние клиента | **TanStack Query** | Кэш данных, optimistic updates |

### Стоимость
- **Разработка:** 0 ₽
- **Эксплуатация на старте:** 0 ₽ (Supabase free: 500 МБ, 50k MAU; Vercel free: 100 ГБ трафика)
- **Будущее:** при росте — Supabase Pro $25/мес начиная с лимитов

---

## 3. Дизайн-система

### Цветовая палитра

```
--bg            : #000000          // основной фон
--bg-elevated   : #0A0A0A          // карточки, листы
--bg-overlay    : #141414          // hover, активный таб
--border        : #1F1F1F          // тонкие разделители
--text-primary  : #FFFFFF
--text-secondary: #8A8A8E          // вспомогательный (как на iOS)
--text-tertiary : #48484A
--accent-green  : #34C759          // прогресс, успех, вес
--accent-crimson: #FF2D55          // активные дни плана, акцент
--accent-warning: #FF9500          // деактивация, предупреждения
```

### Типографика
- Шрифт: **SF Pro** (system) с фолбэком на Inter
- Заголовки экранов: 28–32px, weight 700, uppercase для главных секций (как на скрине ПРОГРАММА ТРЕНИРОВОК)
- Кнопки/контролы: 17px medium
- Подписи: 13px regular, цвет `--text-secondary`

### Принципы
- Pure black фон, без градиентов
- Минимум 24px воздуха между секциями
- Разделители — линии 1px, не блоки с тенями
- Один акцент на контекст: зелёный для веса/прогресса, малиновый для расписания
- Анимации 200–300мс, ease `[0.16, 1, 0.3, 1]` (Apple-like)

---

## 4. Архитектура

```
[ Браузер / PWA ]
       │
       ▼
[ Next.js 15 на Vercel ]
       │
       ├─ Server Components       — рендер списков, истории, статичных частей
       ├─ Client Components       — таймер, степперы, графики
       ├─ Server Actions          — мутации (записать подход, создать план)
       └─ Service Worker          — офлайн-очередь, фоновая синхронизация
       │
       ▼
[ Supabase ]
       ├─ PostgreSQL              — все данные
       ├─ Auth                    — email/password + Google OAuth
       ├─ Row Level Security      — изоляция данных по user_id
       └─ Storage                 — аватары пользователей
```

Разделение на сервер/клиент:
- Чтение списков (упражнения, история сессий) — Server Components, рендерятся на сервере
- Интерактив (запись подхода, таймер, степпер) — Client Components
- Мутации — Server Actions (никаких REST/RPC роутов вручную)

---

## 5. Модель данных (Postgres)

```sql
-- Профиль (1:1 с auth.users)
profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id),
  name         TEXT NOT NULL,
  avatar_url   TEXT,
  goal         TEXT,                    -- свободный текст «набрать массу», «похудеть»
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Упражнения. Системные (is_system=true) — общие для всех. Пользовательские — на конкретного юзера.
-- muscle_groups — массив, потому что компаунды задействуют несколько групп
-- (жим лёжа = ['chest','triceps'], подтягивания = ['back','biceps']).
-- Для подсчёта недельного объёма каждый подход начисляется на ВСЕ группы из массива.
exercises (
  id                UUID PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id),  -- NULL для системных
  name              TEXT NOT NULL,
  muscle_groups     TEXT[] NOT NULL,                  -- ['chest'] | ['back','biceps'] | ...
  increment_kg      NUMERIC(4,2) DEFAULT 2.5,         -- шаг прогрессии веса
  description       TEXT,                             -- для detail-экрана
  technique_tips    TEXT[],                           -- список советов по технике
  historical_fact   TEXT,                             -- интересный факт / история
  is_system         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Канонический список групп мышц (не отдельная таблица — enum-значения):
-- 'chest' (грудь), 'back' (спина), 'shoulders' (плечи),
-- 'biceps' (бицепс), 'triceps' (трицепс), 'forearms' (предплечья),
-- 'quads' (квадрицепс), 'hamstrings' (бицепс бедра), 'glutes' (ягодицы), 'calves' (икры),
-- 'abs' (пресс), 'cardio' (кардио, объём не считается)

-- Недельный план. Можно иметь несколько планов, но активен один.
workout_plans (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Дни плана: «Тренировка #1 во вторник», «#2 в четверг»
plan_days (
  id          UUID PRIMARY KEY,
  plan_id     UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),  -- 1=ПН … 7=ВС
  name        TEXT,                                                -- 'Тренировка #1', 'Грудь+Трицепс'
  order_idx   SMALLINT NOT NULL
);

-- Упражнения внутри дня плана.
-- target_reps и target_weight НЕ хранятся: они вычисляются алгоритмом двойной прогрессии
-- из истории подходов (sets) при подходе к тренировке.
plan_exercises (
  id            UUID PRIMARY KEY,
  plan_day_id   UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id),
  rep_category  TEXT NOT NULL CHECK (rep_category IN ('strength','classic','beginner')),
  target_sets   SMALLINT NOT NULL CHECK (target_sets BETWEEN 1 AND 10),
  order_idx     SMALLINT NOT NULL
);

-- Конкретная тренировка пользователя в конкретный день
sessions (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  plan_day_id   UUID REFERENCES plan_days(id),  -- NULL для свободных тренировок
  date          DATE NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  notes         TEXT
);

-- Подходы — самая частотная таблица.
-- target_reps — снимок цели на момент выполнения (для первого подхода это критичное значение,
-- от которого зависит решение алгоритма «расти повторами / расти весом / держать»).
-- is_first_set — маркер первого подхода в упражнении внутри сессии (он обязан достигать
-- технического отказа на target_reps; последующие подходы валидны при reps >= first.reps - 3).
sets (
  id            UUID PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id),
  weight_kg     NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 0),
  reps          SMALLINT NOT NULL CHECK (reps BETWEEN 0 AND 999),
  target_reps   SMALLINT NOT NULL,                          -- цель на момент подхода
  is_first_set  BOOLEAN NOT NULL DEFAULT FALSE,             -- первый подход в упражнении
  reached_failure BOOLEAN,                                  -- пользователь отметил отказ (кнопка)
  rpe           SMALLINT CHECK (rpe BETWEEN 1 AND 10),      -- опционально
  set_order     SMALLINT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sets_user_exercise_time
  ON sets(exercise_id, completed_at DESC);

-- RLS политики (на каждой таблице):
-- SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()
-- Для exercises: WHERE user_id = auth.uid() OR is_system = TRUE
```

Системные упражнения сидируются миграцией (~25 базовых: жим лёжа, присед со штангой, становая тяга, жим стоя, тяга в наклоне, подтягивания, отжимания на брусьях, сгибания на бицепс, разгибания на трицепс и т.д.). Каждое идёт с заполненными `muscle_groups`, `description`, `technique_tips` и `historical_fact` для отображения в `<ExerciseDetail>`. Тексты живут в `supabase/seed.sql`, выносятся в i18n-friendly формате (ключи в БД, локализация — отдельным шагом).

---

## 6. Структура экранов

| Маршрут | Экран | Описание |
|---|---|---|
| `/login` | Авторизация | Email + пароль, кнопка Google |
| `/onboarding` | Первый запуск | Имя, цель, выбор стартового плана (3 пресета) |
| `/` | Сегодня | Карточка тренировки на сегодня → список упражнений → тап → SetLogger |
| `/plan` | План | Недельный таймлайн ПН-ВС + панель «Объём за неделю по группам мышц» (зелёный 4–10, серый <4, оранжевый >10). Тап по дню → редактор |
| `/plan/edit/[dayId]` | Редактор дня | Добавить упражнение → выбрать категорию повторений (силовая 5-8 / классика 8-12 / новичок 12-15) → задать число подходов |
| `/exercises` | Тренажёры | Каталог + поиск + фильтр по мышечной группе |
| `/exercises/[id]` | Detail-экран | Описание, мышцы, техника, исторический факт + кнопка «Добавить в план» |
| `/exercises/new` | Создание упражнения | Форма: название, группы мышц (мульти), шаг прогрессии, описание |
| `/progress` | Прогресс | Календарь активности + список упражнений |
| `/progress/[exerciseId]` | Детальный прогресс | График веса × времени + шкала с засечками |
| `/profile` | Профиль | Имя, аватар, цель, экспорт CSV, выход |

Поверх — фиксированный нижний таб-бар на 5 кнопок: Сегодня / План / Тренажёры / Прогресс / Профиль.

---

## 7. Ключевые компоненты

### `<SetLogger>`
Главный компонент взаимодействия. Используется на экране «Сегодня» и в свободной тренировке.
- Заголовок: имя упражнения + бейдж категории (силовая / классика / новичок) с диапазоном
- Карточка `<SuggestedTarget>` сверху (подсказка алгоритма)
- Степпер веса: −/+ кнопки с шагом 0.5 / 1 / 2.5 кг (выбирается тапом)
- Степпер повторов: −/+ кнопки 1, заранее выставлен на `target_reps` из подсказки
- Тоггл «До отказа» для первого подхода — обязательный к нажатию (визуально подсвечен зелёным)
- Большая зелёная кнопка «Записать подход»
- Подсветка минимума для подходов 2+: «Минимум: N повт.» (target первого подхода − 3); если пользователь вводит меньше — мягкое предупреждение «Падение >3 повт. — возможно, рабочий вес слишком велик», но запись разрешается
- После записи — `<RestTimer>` стартует автоматически
- Optimistic update: подход появляется в списке мгновенно, синхронизируется на сервер фоном

### `<RestTimer>`
Круговой таймер обратного отсчёта.
- Пресеты: 60с / 90с / 120с / 180с / своё значение
- Звук + вибрация (`navigator.vibrate`) + haptic API на iOS Safari
- Считает в Service Worker — продолжает работать когда вкладка свёрнута
- Большой моноширинный шрифт времени, кольцо прогресса по контуру

### `<WeekTimeline>`
Горизонтальная полоса ПН-ВС со стилем 2-го скриншота.
- Активные дни (есть тренировка) — обведённые малиновым, с подписью «Тренировка #N» снизу
- Неактивные — приглушённый текст
- Тап по дню → редактор плана для этого дня

### `<ProgressScale>`
Линейная шкала с засечками — стиль 1-го скриншота.
- Показывает диапазон весов (например, 12–15 кг)
- Маленькая иконка-маркер (зелёная гирька) над текущим значением
- Тонкая линия с тиками, цифры под тиками

### `<ProgressChart>`
Линейный график веса × времени по упражнению (Recharts).
- Тёмный фон, зелёная линия, точки на каждой сессии
- Tooltip при наведении показывает дату, вес, число повторов

### `<SuggestedTarget>`
Карточка над `<SetLogger>` с подсказкой алгоритма двойной прогрессии.
- Строка 1: «В прошлый раз: **12.5 кг × 12 повт.**» (как было)
- Строка 2: «Сегодня: **12.5 кг × 13 повт.**» (новая цель — выделена зелёным/малиновым)
- Подпись reasoning: «+1 повторение» / «+2.5 кг, повторы → 12» / «Тот же вес — добей до 12 повт.» / «Деделоад после перерыва»
- Категория и диапазон визуально подсвечены сверху: «Классика 8–12»

### `<ExerciseDetail>`
Карточка / экран с подробной информацией об упражнении (открывается тапом из каталога).
- Hero-блок: имя крупно, бейджи задействованных групп мышц
- Секция «Описание» — параграф основного описания
- Секция «Техника» — пронумерованный список советов из `technique_tips`
- Секция «История» — `historical_fact` (заметный блок с цитатой)
- Кнопка снизу «Добавить в план» → выбор дня плана и категории повторений
- Анимация появления секций по скроллу (Framer Motion `whileInView`)

### `<WeeklyVolumePanel>`
Панель внизу экрана `/plan` с подсчётом подходов на каждую группу мышц за неделю.
- Список групп с числом: «Грудь — 6», «Спина — 4», «Бицепс — 3»…
- Цветовая индикация:
  - **Зелёный** (4–10) — рабочий диапазон, оптимально
  - **Серый** (<4) — недостаточный объём для прогресса
  - **Оранжевый** (>10) — высокий объём, риск перетренированности
- Tap по группе → раскрывается список упражнений в плане, бьющих по этой группе

### `<BottomNav>`
Фиксированный таб-бар с 5 иконками. Скрывается при скролле вниз, появляется при скролле вверх (как на iOS).

---

## 8. Алгоритм двойной прогрессии

Файл: `lib/progression.ts`

**Идея.** В рамках выбранной категории повторений (силовая 5–8 / классика 8–12 / новичок 12–15) пользователь сначала растёт **повторами** до верхней границы, затем добавляет **вес** и возвращается к нижней границе. Решение принимается по результату **первого подхода** — он должен достигать технического отказа на текущем `target_reps`.

```typescript
export type RepCategory = 'strength' | 'classic' | 'beginner';

export const REP_RANGES: Record<RepCategory, { low: number; high: number }> = {
  strength: { low: 5,  high: 8  },
  classic:  { low: 8,  high: 12 },
  beginner: { low: 12, high: 15 },
};

export type FirstSetHistory = {
  weight_kg: number;
  reps: number;
  target_reps: number;
  reached_failure: boolean | null;
  completed_at: Date;
};

export type Suggestion = {
  weight_kg: number;
  target_reps: number;          // цель ПЕРВОГО подхода
  min_reps_followups: number;   // минимум для подходов 2+ (target − 3)
  reasoning:
    | 'first_time'      // упражнение делается впервые — пусть пользователь сам подберёт
    | 'reps_up'         // выбил повторения, +1 повтор к цели
    | 'weight_up'       // выбил верх диапазона, +вес и сброс к low
    | 'hold'            // не выбил — повторяем тот же вес и target_reps
    | 'deload';         // перерыв > 14 дней — −10% вес, цель = low

export function suggestNext(
  history: FirstSetHistory[],   // только первые подходы из последних сессий, по убыванию даты
  category: RepCategory,
  exerciseIncrement: number = 2.5,
): Suggestion {
  const { low, high } = REP_RANGES[category];

  // Первый раз для этого упражнения
  if (history.length === 0) {
    return {
      weight_kg: 0,
      target_reps: low,
      min_reps_followups: Math.max(1, low - 3),
      reasoning: 'first_time',
    };
  }

  const last = history[0];
  const daysSince = daysBetween(last.completed_at, new Date());

  // Деделоад при долгом перерыве
  if (daysSince > 14) {
    return {
      weight_kg: roundToHalfKg(last.weight_kg * 0.9),
      target_reps: low,
      min_reps_followups: Math.max(1, low - 3),
      reasoning: 'deload',
    };
  }

  // Не дотянул до цели на первом подходе — повторяем
  if (last.reps < last.target_reps) {
    return {
      weight_kg: last.weight_kg,
      target_reps: last.target_reps,
      min_reps_followups: Math.max(1, last.target_reps - 3),
      reasoning: 'hold',
    };
  }

  // Выбил верхнюю границу — добавляем вес, цель = low
  if (last.target_reps >= high) {
    return {
      weight_kg: last.weight_kg + exerciseIncrement,
      target_reps: low,
      min_reps_followups: Math.max(1, low - 3),
      reasoning: 'weight_up',
    };
  }

  // Выбил текущую цель внутри диапазона — добавляем повторение
  return {
    weight_kg: last.weight_kg,
    target_reps: last.target_reps + 1,
    min_reps_followups: Math.max(1, last.target_reps + 1 - 3),
    reasoning: 'reps_up',
  };
}
```

**Валидация подходов в рамках сессии (отдельная функция):**

```typescript
export function validateFollowupSet(firstSetReps: number, currentReps: number): {
  ok: boolean;
  warning?: string;
} {
  if (currentReps >= firstSetReps - 3) return { ok: true };
  return {
    ok: true,    // не блокируем, только предупреждаем
    warning: 'Падение более чем на 3 повторения от первого подхода — возможно, рабочий вес слишком велик.',
  };
}
```

`exerciseIncrement` берётся из `exercises.increment_kg` (по умолчанию 2.5 кг для штанговых, 1 кг для гантельных). Это самый ответственный кусок логики — покрывается юнит-тестами для всех веток reasoning и крайних случаев (выход из диапазона, граничные дни перерыва).

---

## 8.1. Подсчёт недельного объёма по группам мышц

Файл: `lib/volume.ts`

```typescript
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders'
  | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'abs' | 'cardio';

export type VolumeStatus = 'under' | 'optimal' | 'over';

export function computeWeeklyVolume(
  planDays: { exercises: { exercise: { muscle_groups: MuscleGroup[] }; target_sets: number }[] }[],
): Record<MuscleGroup, number> {
  const totals = {} as Record<MuscleGroup, number>;
  for (const day of planDays) {
    for (const pe of day.exercises) {
      for (const muscle of pe.exercise.muscle_groups) {
        totals[muscle] = (totals[muscle] ?? 0) + pe.target_sets;
      }
    }
  }
  return totals;
}

export function statusFor(group: MuscleGroup, sets: number): VolumeStatus {
  if (group === 'cardio') return 'optimal';   // для кардио объём не считается
  if (sets < 4)  return 'under';
  if (sets > 10) return 'over';
  return 'optimal';
}
```

Каждый подход на упражнение со списком групп мышц `['chest','triceps']` начисляет +1 в `chest` и +1 в `triceps`. `<WeeklyVolumePanel>` использует `statusFor` для цветовой индикации.

---

## 9. Ошибки, валидация, офлайн

- **Server actions** валидируют вход через Zod (`weight_kg >= 0`, `reps 1..999`, обязательные поля). Ошибка → возврат `{ error: string }` → тост.
- **Auth** — middleware проверяет сессию на защищённых маршрутах, редирект на `/login` при истечении.
- **RLS** — все таблицы под политиками. Если запрос приходит без авторизации — Postgres сам вернёт пустой результат.
- **Tolerance-предупреждение** — при записи подхода 2+ с `reps < first_set.reps - 3` показывается некритичное предупреждение, но запись разрешается (`validateFollowupSet`).
- **Объём вне диапазона** — в плане-редакторе панель `<WeeklyVolumePanel>` показывает оранжевый/серый цвет, но не блокирует сохранение (методология — рекомендация, не правило).
- **Офлайн-запись подхода** — Service Worker через Background Sync API кладёт подход в очередь IndexedDB и синхронизирует при появлении сети. UI рендерит подход сразу с пометкой «синхронизация…».
- **Toast-уведомления** через `sonner`: «✓ Подход записан» / «⚠ Не удалось сохранить, попробую ещё раз».

---

## 10. Тесты

| Тип | Инструмент | Что покрываем |
|---|---|---|
| Unit | Vitest | `progression.ts` — все ветки reasoning (`first_time`, `reps_up`, `weight_up`, `hold`, `deload`) для всех 3 категорий, граничные дни перерыва, разные `increment_kg` |
| Unit | Vitest | `validateFollowupSet` — точная граница `first - 3`, `first - 4` (warning), нулевые повторы |
| Unit | Vitest | `volume.ts` — компаунды бьют по нескольким группам, статусы `under/optimal/over`, кардио |
| Unit | Vitest | Утилиты дат |
| Component | Vitest + Testing Library | `<SetLogger>` — степперы, тоггл «До отказа», валидация подходов 2+, отправка |
| Component | Vitest + Testing Library | `<WeeklyVolumePanel>` — корректные итоги и цвета по группам |
| E2E | Playwright | «Логин → записать тренировку → увидеть в прогрессе» |
| E2E | Playwright | «Создать план → дойти до экрана Сегодня → пройти тренировку» |
| E2E | Playwright | «Открыть detail упражнения → добавить в план → увидеть в `<WeeklyVolumePanel>`» |
| Integration | Supabase локально | Миграции, RLS политики (нельзя прочитать чужие данные) |

---

## 11. Структура папок

```
gym-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx              # таб-бар, общий каркас
│   │   ├── page.tsx                # /  → Сегодня
│   │   ├── plan/page.tsx
│   │   ├── plan/edit/[dayId]/page.tsx
│   │   ├── exercises/page.tsx
│   │   ├── exercises/[id]/page.tsx
│   │   ├── exercises/new/page.tsx
│   │   ├── progress/page.tsx
│   │   ├── progress/[exerciseId]/page.tsx
│   │   └── profile/page.tsx
│   ├── onboarding/page.tsx
│   ├── manifest.ts                 # PWA manifest
│   └── globals.css
├── components/
│   ├── ui/                         # Button, Input, Stepper, Sheet
│   ├── nav/BottomNav.tsx
│   ├── workout/
│   │   ├── SetLogger.tsx
│   │   ├── RestTimer.tsx
│   │   └── SuggestedTarget.tsx
│   ├── plan/
│   │   ├── WeekTimeline.tsx
│   │   ├── DayEditor.tsx
│   │   └── WeeklyVolumePanel.tsx
│   ├── exercises/
│   │   ├── ExerciseDetail.tsx
│   │   └── ExerciseCatalog.tsx
│   └── progress/
│       ├── ProgressScale.tsx
│       ├── ProgressChart.tsx
│       └── ActivityCalendar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts               # server client
│   │   └── middleware.ts
│   ├── progression.ts              # двойная прогрессия + validateFollowupSet
│   ├── volume.ts                   # подсчёт недельного объёма
│   ├── pwa/sw.ts
│   └── utils.ts
├── server/                         # server actions
│   ├── sets.ts
│   ├── sessions.ts
│   ├── plans.ts
│   └── exercises.ts
├── types/
│   └── supabase.ts                 # автогенерация
├── supabase/
│   ├── migrations/
│   └── seed.sql                    # системные упражнения
├── tests/
│   ├── unit/
│   └── e2e/
├── public/
│   └── icons/                      # PWA иконки
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 12. Этапы реализации (превью — детальный план будет отдельным документом)

1. Каркас Next.js + Tailwind + базовые UI-примитивы и темная тема
2. Supabase: миграции (с `muscle_groups TEXT[]`, `rep_category` enum, `is_first_set`), RLS, seed системных упражнений с описаниями/техникой/историческими фактами, генерация типов
3. Аутентификация (login/callback/middleware)
4. Каталог упражнений + добавление пользовательских + **detail-экран `<ExerciseDetail>`**
5. Конструктор недельного плана: `<WeekTimeline>` + редактор дня с выбором категории повторений + **`<WeeklyVolumePanel>`** (объём по группам мышц)
6. Алгоритм двойной прогрессии (`lib/progression.ts`) + `<SuggestedTarget>` с reasoning
7. Экран «Сегодня» + `<SetLogger>` (с тогглом «До отказа», валидацией tolerance) + `<RestTimer>`
8. Прогресс: календарь активности + `<ProgressChart>` + `<ProgressScale>`
9. Профиль + экспорт CSV
10. PWA: manifest, service worker, офлайн-очередь подходов через Background Sync
11. E2E-тесты, полировка анимаций (Framer Motion), деплой на Vercel

Каждый этап — отдельная PR-ветка. Детали — в плане реализации.

---

## 13. Открытые вопросы (на потом, не блокируют MVP)

- Стартовый набор пресет-планов для онбординга — какие именно (3-дневный full body, 4-дневный сплит, 5-дневный pull/push/legs)?
- Где хранить аватары — Supabase Storage или просто URL?
- Поведение когда пользователь хочет сделать тренировку «не по плану» в день, на котором тренировка по плану — заменить или дополнить?
- Тёмная тема единственная или добавлять светлую?

Эти решаем по ходу реализации, на дизайн системы не влияют.
