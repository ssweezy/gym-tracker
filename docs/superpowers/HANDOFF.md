# Gym Tracker — Контекст для следующей сессии

**Дата:** 2026-05-11
**Текущая ветка:** `main`
**Последний коммит:** `9617f4c`

---

## Что это за проект

Личный фитнес-дневник «Gym Tracker» с двойной прогрессией. Web-first (Next.js + Supabase + Vercel), Russian UI, дизайн уровня Apple Fitness (pure black + crimson/green accents). Цель — потом переписать под App Store, поэтому архитектура нацелена на чистый разделённый слой данных.

**Пользователь:** соло-разработчик, говорит на русском, ценит темп (короткие итерации, рекомендация + один вопрос на подтверждение).

---

## Документы

| Файл | Что внутри |
|---|---|
| `docs/superpowers/specs/2026-05-06-gym-tracker-design.md` | 595 строк — полная дизайн-спека: цели, стек, цветовая палитра, 13 секций |
| `docs/superpowers/plans/2026-05-06-gym-tracker-implementation.md` | 5915 строк — план на 44 задачи в 11 фазах |
| `docs/superpowers/HANDOFF.md` | этот файл |

---

## Стек (зафиксирован)

- **Frontend:** Next.js 15 App Router (TypeScript строгий, React 19)
- **Стили:** Tailwind CSS v3 (намеренно v3, не v4 — план под v3-конфиг)
- **UI:** кастомные примитивы + Framer Motion + Lucide
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Row Level Security)
- **Хостинг:** Vercel free tier
- **Тесты:** Vitest (jsdom) + RTL для unit/component, Playwright для E2E
- **PWA:** next-pwa + Service Worker + IndexedDB + Background Sync для офлайн-очереди подходов

---

## Дизайн-токены (готовы в `tailwind.config.ts`)

| Токен | Значение | Когда |
|---|---|---|
| `bg` | `#000000` | основной фон |
| `bg-elevated` | `#0A0A0A` / `#141414` | карточки |
| `text-primary` | `#FFFFFF` | заголовки |
| `text-secondary` | `~#A1A1A6` | подзаголовки |
| `text-tertiary` | `~#6E6E73` | подсказки |
| `border` | `#1F1F1F` | разделители |
| `accent-green` | `#34C759` | прогресс, вес |
| `accent-crimson` | `#FF2D55` | расписание, активные дни |

Никаких хардкоженных hex в компонентах — только через токены.

---

## Что выполнено

### Phase 1: Foundation (Tasks 1–3) ✅
- `1cfba34` Scaffold Next.js 15 + TypeScript + Tailwind v3 + ESLint + Prettier
- `975891b` Dark Apple-style токены в `tailwind.config.ts` и `globals.css`
- `96b856c` UI-примитивы: `components/ui/{Button,Input,Stepper,Sheet,Badge,Toggle}.tsx`
  - **Stepper** поддерживает дробный шаг (`precision`) для веса в кг

### Phase 2: Vitest (Task 4) ✅
- `083ba00` `vitest.config.ts` + `tests/setup.ts` + smoke + Button render test
- Scripts: `test`, `test:watch`, `test:e2e`, `typecheck`

### Phase 5: Алгоритмы (Tasks 14–15) ✅
- `7a9ccb0` `lib/progression.ts` — двойная прогрессия (14 тестов, +1 `it.todo` intentional на classic-8 edge case)
- `9fc383d` `lib/volume.ts` — недельный объём по группам мышц (10 тестов)
- `3814ee9` Type cleanup — `SetHistoryEntry` (вместо `FirstSetHistory`), `VolumeDay/VolumeExercise` приватные
- `9617f4c` Tightened Phase 7 typing — `LoggedSet`, фильтрация `is_first_set` в запросе

**Всего тестов:** 25 passed + 1 todo (4 файла). Typecheck — зелёный.

### Корректировки плана
- `69b7a53` Fix plan inconsistencies — переименовал `workout_plans` → `plans`, добавил `is_rest`/`title` в `plan_days`, расширил `profiles` (`display_name`/`bodyweight_kg`/`unit_system`)

---

## Что заблокировано

**Главный блокер — Supabase нужна реальная БД.** Docker Desktop не установлен на машине, поэтому `npx supabase start` не работает.

Заблокированные фазы:
- Phase 3 (Tasks 5–10): миграции схемы и RLS, seed упражнений, генерация типов, Supabase clients
- Phase 4 (Tasks 11–13): login/OAuth/logout/onboarding
- Phase 5b (Tasks 16–20): каталог упражнений
- Phase 6 (Tasks 21–25): редактор плана + WeeklyVolumePanel
- Phase 7 (Tasks 26–31): экран «Сегодня» + SetLogger + RestTimer
- Phase 8 (Tasks 32–35): прогресс
- Phase 9 (Tasks 36–38): профиль + CSV-экспорт
- Phase 10 (Tasks 39–41): PWA + offline queue (manifest без иконок можно сделать сейчас, но смысла мало)
- Phase 11 (Tasks 42–44): E2E + анимации + Vercel deploy

---

## Решение, которое ждёт от пользователя

Выбрать путь для базы данных:

**Путь 1: Docker Desktop (локально)**
- Установить https://www.docker.com/products/docker-desktop (arm64 для Apple Silicon)
- `npx supabase start` поднимает локальный Postgres + GoTrue + Storage в контейнерах
- План в `2026-05-06-gym-tracker-implementation.md` Phase 3 идёт без изменений

**Путь 2: Облачный Supabase (рекомендован за темп)**
1. supabase.com → Start your project → войти через GitHub
2. New project: name `gym-tracker`, password (записать!), region Frankfurt/Stockholm
3. ~2 минуты на провижн
4. Settings → API → скопировать и прислать:
   - `Project URL` (`https://xxxxx.supabase.co`)
   - `anon public` ключ
   - `service_role` ключ
5. Далее в Phase 3: `supabase link --project-ref` + `supabase db push` вместо `supabase start`

---

## Известные нюансы и предупреждения

1. **Next.js 16.2.6 поставился вместо 15** — план писался под v15. Tailwind откатили с v4 на v3, остальное работает. Если хочешь зафиксировать Next 15 — это отдельная задача в Phase 1 ревизии.
2. **Node 22.12.0 < 22.13.0** — EBADENGINE warning для некоторых пакетов. Не блокер, но перед PWA/Supabase разумно поднять.
3. **`AGENTS.md` и `CLAUDE.md`** появились от `create-next-app`. Стандартные стабы — оставлены, можно удалить.
4. **`it.todo` в `tests/unit/progression.test.ts`** intentional — на проверку classic-8 на нижней границе. Не трогать без обсуждения логики двойной прогрессии.
5. **Тип `LoggedSet`** (в плане Phase 7) отдельный от `SetHistoryEntry` — потому что SetLogger показывает все подходы дня (включая follow-up'ы), а алгоритм работает только с первыми подходами.

---

## Принципиальные методологические договорённости (из памяти)

Эти правила — основа всей логики приложения, заданы пользователем. Любое отклонение = баг.

**Категории повторений (одна на упражнение в плане):**
- `strength` — 5–8 повторов
- `classic` — 8–12 повторов
- `beginner` — 12–15 повторов

**Двойная прогрессия:**
- Подбираешь вес так, чтобы первый подход → отказ на LOW (например 12 для новичка)
- Каждую тренировку: +1 повторение в `target_reps` первого подхода (12 → 13 → 14 → 15)
- Когда первый подход дотянул до HIGH (15) → +`increment_kg` в весе, `target_reps` сбрасывается на LOW (12)
- Решение принимается **ТОЛЬКО по первому подходу**

**Tolerance (внутри сессии):**
- Подходы 2+ могут просесть в повторениях относительно первого
- Допустимое падение — до 3 повторов
- > 3 → soft warning «возможно, слишком тяжёлый рабочий вес», запись разрешена

**Недельный объём по группам мышц:**
- 4 подхода/неделя — стартовый минимум для прогресса
- 10 подходов/неделя — потолок профессионалов
- Компаунды (жим лёжа, подтягивания) считаются в **каждую** перечисленную группу мышц

---

## План работы по этапам (Subagent-Driven)

Пользователь выбрал путь 1 из execution-handoff — подагенты выполняют фазы.

| Stage | Phases | Tasks | Статус |
|---|---|---|---|
| 1 | Phase 1 | 1–3 | ✅ |
| 2 | Phase 2 + Phase 3 | 4 / 5–10 | ⚠️ Phase 2 done, Phase 3 заблокирован Supabase |
| 3 | Phase 4 + Phase 5 | 11–13 / 14–15 | ⚠️ Phase 5 done, Phase 4 ждёт |
| 4 | Phase 5b + 6 + 9 | 16–20 / 21–25 / 36–38 | ⏸️ |
| 5 | Phase 7 | 26–31 | ⏸️ |
| 6 | Phase 8 + Phase 10 | 32–35 / 39–41 | ⏸️ |
| 7 | Phase 11 | 42–44 | ⏸️ |

После разблокировки Supabase:
1. Запустить агента на Phase 3 (миграции + RLS + seed + типы + clients)
2. Параллельно агенты на Phase 4 и далее по таблице

---

## Структура папок (текущая)

```
gym-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── favicon.ico
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Stepper.tsx
│       ├── Sheet.tsx
│       ├── Badge.tsx
│       └── Toggle.tsx
├── lib/
│   ├── progression.ts        ← двойная прогрессия
│   ├── volume.ts             ← недельный объём
│   └── utils.ts              ← cn helper
├── tests/
│   ├── setup.ts
│   └── unit/
│       ├── smoke.test.ts
│       ├── button.test.tsx
│       ├── progression.test.ts
│       └── volume.test.ts
├── docs/
│   └── superpowers/
│       ├── HANDOFF.md
│       ├── specs/2026-05-06-gym-tracker-design.md
│       └── plans/2026-05-06-gym-tracker-implementation.md
├── tailwind.config.ts        ← все дизайн-токены
├── postcss.config.mjs
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── (Next.js boilerplate)
```

Папок ещё нет (создаются в будущих фазах): `server/`, `hooks/`, `components/{plan,today,progress,exercises}/`, `app/(app)/*`, `app/login/`, `app/onboarding/`, `supabase/`, `types/`, `e2e/`, `public/icons`, `lib/queries/`, `lib/offline/`, `lib/types/`, `lib/supabase/`.

---

## Что делать в следующей сессии

1. Прочитать этот файл и `docs/superpowers/plans/2026-05-06-gym-tracker-implementation.md`
2. Уточнить у пользователя выбор путь 1 vs путь 2 (если ещё не сделан)
3. После выбора:
   - Путь 2: получить ключи, записать в `.env.local`, `supabase link` → `supabase db push`
   - Путь 1: дождаться установки Docker и продолжить Task 5 по плану
4. После разблокировки — запустить Stage 3+ агентов по таблице выше
5. Перед каждым новым агентом — проверить, что план в актуальном состоянии (особенно секции, которые он будет реализовывать)

---

**Полезные команды для проверки состояния:**

```bash
cd "/Users/macbookair/Desktop/Main/Web Development/gym-app"
git log --oneline -15
npm test              # должно быть 25 passed + 1 todo
npm run typecheck     # без ошибок
npm run build         # должен пройти
npm run lint          # чисто
```
