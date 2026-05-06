# Gym Tracker — Design Spec

**Дата:** 2026-05-06
**Статус:** проект (нулевая итерация)
**Цель:** персональный фитнес-дневник — записывать вес × повторы по упражнениям, видеть прогресс, планировать неделю.

---

## 1. Цели и не-цели

### Цели MVP
- Аутентификация (email + Google OAuth)
- Каталог упражнений + добавление пользовательских
- Запись подходов (вес × повторы) во время тренировки
- Конструктор недельного плана (понедельник–воскресенье)
- Экран «Сегодня» — что нужно сделать по плану на текущий день
- Прогресс по дням и по упражнениям (графики + шкала засечек)
- Локальный алгоритм прогрессивной перегрузки — подсказка целевого веса
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
exercises (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),  -- NULL для системных
  name          TEXT NOT NULL,
  muscle_group  TEXT NOT NULL,                   -- 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'
  increment_kg  NUMERIC(4,2) DEFAULT 2.5,        -- шаг прогрессии
  is_system     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

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

-- Упражнения внутри дня плана
plan_exercises (
  id            UUID PRIMARY KEY,
  plan_day_id   UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id),
  target_sets   SMALLINT NOT NULL,
  target_reps   SMALLINT NOT NULL,
  target_weight NUMERIC(5,2),    -- может быть NULL — алгоритм подскажет
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

-- Подходы — самая частотная таблица
sets (
  id            UUID PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id),
  weight_kg     NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 0),
  reps          SMALLINT NOT NULL CHECK (reps BETWEEN 0 AND 999),
  rpe           SMALLINT CHECK (rpe BETWEEN 1 AND 10),  -- опционально
  set_order     SMALLINT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sets_user_exercise_time
  ON sets(exercise_id, completed_at DESC);

-- RLS политики (на каждой таблице):
-- SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()
-- Для exercises: WHERE user_id = auth.uid() OR is_system = TRUE
```

Системные упражнения сидируются миграцией: жим лёжа, присед со штангой, становая тяга, жим стоя, тяга в наклоне, подтягивания, отжимания на брусьях и ещё ~20 базовых.

---

## 6. Структура экранов

| Маршрут | Экран | Описание |
|---|---|---|
| `/login` | Авторизация | Email + пароль, кнопка Google |
| `/onboarding` | Первый запуск | Имя, цель, выбор стартового плана (3 пресета) |
| `/` | Сегодня | Карточка тренировки на сегодня → список упражнений → тап → SetLogger |
| `/plan` | План | Недельный таймлайн ПН-ВС, тап по дню → редактор |
| `/plan/edit/[dayId]` | Редактор дня | Добавить/убрать упражнения, задать целевые сеты/повторы |
| `/exercises` | Тренажёры | Каталог + поиск + фильтр по мышечной группе |
| `/exercises/new` | Создание упражнения | Форма: название, группа, шаг прогрессии |
| `/progress` | Прогресс | Календарь активности + список упражнений |
| `/progress/[exerciseId]` | Детальный прогресс | График веса × времени + шкала с засечками |
| `/profile` | Профиль | Имя, аватар, цель, экспорт CSV, выход |

Поверх — фиксированный нижний таб-бар на 5 кнопок: Сегодня / План / Тренажёры / Прогресс / Профиль.

---

## 7. Ключевые компоненты

### `<SetLogger>`
Главный компонент взаимодействия. Используется на экране «Сегодня» и в свободной тренировке.
- Степпер веса: −/+ кнопки с шагом 0.5 / 1 / 2.5 кг (выбирается тапом)
- Степпер повторов: −/+ кнопки 1
- Большая зелёная кнопка «Записать подход»
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
Карточка над `<SetLogger>` с подсказкой алгоритма прогрессии.
- «В прошлый раз: 12.5 кг × 10 повт.»
- «Цель сегодня: **14 кг × 10 повт.**» (зелёный, если есть прирост)

### `<BottomNav>`
Фиксированный таб-бар с 5 иконками. Скрывается при скролле вниз, появляется при скролле вверх (как на iOS).

---

## 8. Локальный алгоритм прогрессии

Файл: `lib/progression.ts`

```typescript
type SetHistory = {
  weight_kg: number;
  reps: number;
  target_reps: number;
  completed_at: Date;
};

type Suggestion = {
  weight_kg: number;
  reps: number;
  reasoning: 'first_time' | 'progress' | 'hold' | 'deload';
};

export function suggestNext(
  history: SetHistory[],
  exerciseIncrement: number = 2.5,
): Suggestion {
  const last = lastSession(history);  // подходы последней тренировки

  // Первый раз — отдаём заглушку, пользователь введёт сам
  if (!last || last.length === 0) {
    return { weight_kg: 0, reps: 0, reasoning: 'first_time' };
  }

  const hitAllReps = last.every(s => s.reps >= s.target_reps);
  const daysSince = daysBetween(last[0].completed_at, new Date());

  // Перерыв > 14 дней — деделоад: −10%
  if (daysSince > 14) {
    return {
      weight_kg: round(last[0].weight_kg * 0.9, 0.5),
      reps: last[0].target_reps,
      reasoning: 'deload',
    };
  }

  // Свежо и выбил все повторы — добавляем шаг
  if (hitAllReps && daysSince <= 7) {
    return {
      weight_kg: last[0].weight_kg + exerciseIncrement,
      reps: last[0].target_reps,
      reasoning: 'progress',
    };
  }

  // Не выбил повторы или прошло > 7 дней — повторяем
  return {
    weight_kg: last[0].weight_kg,
    reps: last[0].target_reps,
    reasoning: 'hold',
  };
}
```

`exerciseIncrement` берётся из `exercises.increment_kg` (по умолчанию 2.5 кг для штанговых, 1 кг для гантельных). Это самый ответственный кусок логики — покрывается юнит-тестами.

---

## 9. Ошибки, валидация, офлайн

- **Server actions** валидируют вход через Zod (`weight_kg >= 0`, `reps 1..999`, обязательные поля). Ошибка → возврат `{ error: string }` → тост.
- **Auth** — middleware проверяет сессию на защищённых маршрутах, редирект на `/login` при истечении.
- **RLS** — все таблицы под политиками. Если запрос приходит без авторизации — Postgres сам вернёт пустой результат.
- **Офлайн-запись подхода** — Service Worker через Background Sync API кладёт подход в очередь IndexedDB и синхронизирует при появлении сети. UI рендерит подход сразу с пометкой «синхронизация…».
- **Toast-уведомления** через `sonner`: «✓ Подход записан» / «⚠ Не удалось сохранить, попробую ещё раз».

---

## 10. Тесты

| Тип | Инструмент | Что покрываем |
|---|---|---|
| Unit | Vitest | `progression.ts` — все ветки алгоритма (первый раз, прогресс, hold, deload, разные шаги) |
| Unit | Vitest | Утилиты дат, расчётов (например, totalVolume) |
| Component | Vitest + Testing Library | `<SetLogger>` — степперы, валидация, отправка |
| E2E | Playwright | «Логин → записать тренировку → увидеть в прогрессе» |
| E2E | Playwright | «Создать план → дойти до экрана Сегодня → пройти тренировку» |
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
│   │   └── DayEditor.tsx
│   └── progress/
│       ├── ProgressScale.tsx
│       ├── ProgressChart.tsx
│       └── ActivityCalendar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # browser client
│   │   ├── server.ts               # server client
│   │   └── middleware.ts
│   ├── progression.ts
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
2. Supabase: миграции, RLS, seed системных упражнений, генерация типов
3. Аутентификация (login/callback/middleware)
4. Каталог упражнений + добавление пользовательских
5. Конструктор недельного плана (WeekTimeline + редактор дня)
6. Экран «Сегодня» + SetLogger + RestTimer
7. Алгоритм прогрессии + SuggestedTarget
8. Прогресс: календарь активности + ProgressChart + ProgressScale
9. Профиль + экспорт
10. PWA: manifest, service worker, офлайн-очередь
11. E2E-тесты, полировка анимаций, деплой на Vercel

Каждый этап — отдельная PR-ветка. Детали — в плане реализации.

---

## 13. Открытые вопросы (на потом, не блокируют MVP)

- Стартовый набор пресет-планов для онбординга — какие именно (3-дневный full body, 4-дневный сплит, 5-дневный pull/push/legs)?
- Где хранить аватары — Supabase Storage или просто URL?
- Поведение когда пользователь хочет сделать тренировку «не по плану» в день, на котором тренировка по плану — заменить или дополнить?
- Тёмная тема единственная или добавлять светлую?

Эти решаем по ходу реализации, на дизайн системы не влияют.
