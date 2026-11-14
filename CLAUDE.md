# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Personal gym tracker ("Gym Tracker") built around **double progression**. Russian-language UI, mobile-first PWA (layout capped at `max-w-md`), Apple Fitness–style dark design. Stack: Next.js 16 App Router + React 19, Supabase (Postgres + Auth + RLS, cloud project — no local Docker), Tailwind **v3** (intentionally not v4), Framer Motion, Recharts, Vercel (`fra1`).

Original design spec and implementation plan live in `docs/superpowers/` (the plan was written for Next 15 and `HANDOFF.md` is outdated about what's blocked — trust the code over those docs).

## Commands

```bash
npm run dev          # dev server on :3000
npm run build
npm run lint         # eslint (flat config)
npm run typecheck    # tsc --noEmit
npm test             # vitest run (jsdom, globals, tests/setup.ts)
npx vitest run tests/unit/progression.test.ts   # single file
npx vitest run -t "name of test"                # single test by name
```

`npm run test:e2e` exists but there is no Playwright config or E2E suite yet.

Supabase (cloud, linked via `SUPABASE_PROJECT_REF` / `SUPABASE_ACCESS_TOKEN` in `.env.local`):
```bash
npx supabase db push                                                  # apply supabase/migrations/*
npx supabase gen types typescript --project-id <ref> > types/supabase.ts   # regenerate after schema changes
```
Schema changes = new timestamped file in `supabase/migrations/` (never edit applied ones), then regenerate `types/supabase.ts`.

## Architecture

- **`proxy.ts`** (Next 16's replacement for `middleware.ts`) → `lib/supabase/middleware.ts#updateSession`: refreshes the Supabase session and redirects unauthenticated users to `/login`. Public paths: `/login`, `/forgot`, `/auth/*`, `/onboarding`, `/mockup/*`. The matcher must keep excluding `sw.js`, `manifest`, `icons`, `offline.html`, or the PWA breaks.
- **`app/(app)/`** — authenticated screens (Сегодня `/`, `plan`, `exercises`, `progress`, `profile`, `workout/new`, `account/recover`). Its layout wraps everything in `OfflineQueueProvider` → `RestTimerProvider` and renders `BottomNav` + `FloatingRestTimer`. **`app/(auth)/`** — login/forgot. **`app/mockup/`** — static design mockups with their own components in `components/mockup/`; not wired to data.
- **`server/`** — the data layer. All files are `'use server'` modules: reads are called directly from server components, mutations are server actions that return `{ error?: string }` (Russian messages) and call `revalidatePath`. Each function gets its own client via `lib/supabase/server.ts#createClient()` and checks `auth.getUser()`. The layer is deliberately isolated so the app can later be ported to native. Row types come from `server/types.ts` (aliases over generated `types/supabase.ts`).
  - `server/exercises-static.ts` uses a cookie-less anon client + `unstable_cache` for the shared system-exercise catalog only — never use it for user-scoped data.
  - `sessions.meta` (jsonb, typed as `SessionMeta`) holds per-session ad-hoc state (skipped plan exercises, set-count overrides) keyed by `plan_exercises.id`.
  - **Seasons** (`server/seasons.ts`): stats/history are scoped to the active season (`ended_at is null`, at most one per user). `ensureActiveSeason()` lazily creates one and adopts season-less sessions; "reset all" archives the season instead of deleting data.
- **`lib/`** — pure logic (`progression.ts`, `volume.ts`, unit-tested), date helpers with Russian month names and weekday conversion (`date.ts`), muscle/sub-muscle maps, exercise image mapping (`exercise-images.ts`: Russian name → yuhonas/free-exercise-db slug; remote host whitelisted in `next.config.ts`).
- **Offline/PWA** — hand-written `public/sw.js` (bump `CACHE_VERSION` when changing caching behavior) + `app/manifest.ts`. Set logging goes through `lib/pwa/log-set.ts`: offline or network-shaped errors enqueue into IndexedDB (`lib/pwa/offline-queue.ts`), and `lib/pwa/sync.ts` drains the queue back through the same `logSet` server action (no separate sync endpoint). There is no idempotency key yet, so duplicates are possible on flaky networks.
- **Styling** — colors only via Tailwind tokens from `tailwind.config.ts` / `lib/design-tokens.ts` (`bg`, `bg-elevated`, `text-primary/secondary/tertiary`, `border`, `accent-green` = progress/weight, `accent-crimson` = schedule/active days). No hardcoded hex in components. UI primitives in `components/ui/`.

## Domain rules (user-defined — deviating is a bug)

- Each plan exercise has one rep category: `strength` 5–8, `classic` 8–12, `beginner` 12–15.
- Double progression decides **only from the first set** (`is_first_set`): each workout +1 to the first set's `target_reps`; once it reaches the top of the range → add `increment_kg` and reset target to the bottom.
- Sets 2+ may drop up to 3 reps vs. the first set; a larger drop shows a soft warning ("возможно, слишком тяжёлый рабочий вес") but is still recorded.
- Weekly volume per muscle group: 4 sets/week = minimum, 10 = ceiling. Compound exercises count toward **every** listed muscle group.
- Minimum rest timer is 3 minutes.
- The `it.todo` in `tests/unit/progression.test.ts` (classic-8 lower-bound edge case) is intentional — don't resolve it without discussing the progression logic.
