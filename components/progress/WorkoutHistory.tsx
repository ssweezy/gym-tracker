'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Layers, Loader2, Trash2, TriangleAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal } from '@/components/motion/stagger';
import {
  deleteWorkout,
  getWorkoutDetail,
  listWorkoutHistory,
} from '@/server/history';
import { startNewSeason } from '@/server/seasons';
import { tapMedium, tapSoft, tapSuccess, tapError } from '@/lib/haptics';
import type {
  SeasonSummary,
  WorkoutDetail,
  WorkoutHistoryItem,
} from '@/server/types';

const RU_MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

export function WorkoutHistory({
  items,
  seasons,
}: {
  items: WorkoutHistoryItem[];
  seasons: SeasonSummary[];
}) {
  const router = useRouter();
  const activeSeason = seasons.find((s) => s.is_active) ?? seasons[0] ?? null;

  const [seasonId, setSeasonId] = useState<string | null>(
    activeSeason?.id ?? null,
  );
  const [list, setList] = useState<WorkoutHistoryItem[]>(items);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [seasonName, setSeasonName] = useState(activeSeason?.name ?? '');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkoutDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pending, start] = useTransition();
  const [switching, startSwitch] = useTransition();

  const viewingActive = seasonId === activeSeason?.id;

  function pickSeason(id: string) {
    if (id === seasonId) return;
    tapSoft();
    setSeasonId(id);
    startSwitch(async () => {
      const rows = await listWorkoutHistory(50, id);
      setList(rows);
    });
  }

  function remove(id: string) {
    tapMedium();
    start(async () => {
      const res = await deleteWorkout(id);
      if (res.error) {
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
      toast.success('Тренировка удалена');
      setConfirmId(null);
      setList((prev) => prev.filter((w) => w.id !== id));
      router.refresh();
    });
  }

  function confirmNewSeason() {
    tapMedium();
    start(async () => {
      const res = await startNewSeason(seasonName);
      if (res.error) {
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
      toast.success(`Сезон «${seasonName.trim()}» сохранён — новый начат`);
      setNewSeasonOpen(false);
      router.refresh();
    });
  }

  async function openDetail(id: string) {
    tapSoft();
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    const d = await getWorkoutDetail(id);
    setDetail(d);
    setDetailLoading(false);
  }

  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailId]);

  return (
    <>
      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          История тренировок
        </h2>
        {viewingActive && list.length > 0 && (
          <button
            type="button"
            onClick={() => {
              tapMedium();
              setSeasonName('');
              setNewSeasonOpen(true);
            }}
            className="text-[12px] font-semibold text-accent-crimson active:opacity-70"
          >
            Новый сезон
          </button>
        )}
      </Reveal>

      {seasons.length > 1 && (
        <Reveal className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
          {seasons.map((s) => {
            const sel = s.id === seasonId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSeason(s.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95 ${
                  sel
                    ? 'bg-text-primary text-bg'
                    : 'bg-white/[0.05] text-text-secondary'
                }`}
              >
                {s.name}
                {s.is_active && ' · текущий'}
                <span
                  className={`ml-1.5 tabular-nums ${
                    sel ? 'text-bg/55' : 'text-text-tertiary'
                  }`}
                >
                  {s.workout_count}
                </span>
              </button>
            );
          })}
        </Reveal>
      )}

      {newSeasonOpen && (
        <Reveal className="mt-3">
          <div className="overflow-hidden rounded-[22px] bg-bg-elevated p-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <TriangleAlert size={16} className="text-accent-crimson" />
              Начать новый сезон
            </div>
            <p className="mt-1.5 text-[12.5px] text-text-tertiary">
              Текущий сезон сохранится в архив под этим названием. Тренировки не
              удаляются — их можно посмотреть, переключив сезон. Статистика
              начнётся заново.
            </p>
            <input
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              placeholder="Название сезона (напр. «Зима 2026» / «Тесты»)"
              maxLength={60}
              className="mt-3 h-12 w-full rounded-xl border border-border bg-bg px-3.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-text-secondary focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setNewSeasonOpen(false)}
                disabled={pending}
                className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmNewSeason}
                disabled={pending || !seasonName.trim()}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                  boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
                }}
              >
                {pending ? 'Сохраняю…' : 'Сохранить и начать'}
              </button>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal className="mt-3 pb-2">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          {switching ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-[13px] text-text-tertiary">
              <Loader2 size={15} className="animate-spin" /> Загрузка…
            </div>
          ) : list.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              В этом сезоне нет завершённых тренировок.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {list.map((w) => (
                <li key={w.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => openDetail(w.id)}
                      className="flex-1 min-w-0 text-left active:opacity-80"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                        {fmtDate(w.finished_at)}
                      </span>
                      <h3 className="mt-1 truncate text-[15px] font-semibold tracking-tight">
                        {w.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-tertiary tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {fmtDur(w.duration_min)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers size={11} /> {w.set_count} подх.
                        </span>
                        {w.tonnage_kg > 0 && (
                          <span>
                            {(w.tonnage_kg / 1000).toFixed(1).replace('.', ',')} т
                          </span>
                        )}
                      </div>
                      {w.exercises.length > 0 && (
                        <p className="mt-1.5 line-clamp-2 text-[12px] text-text-secondary">
                          {w.exercises.join(' · ')}
                        </p>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        tapMedium();
                        setConfirmId(confirmId === w.id ? null : w.id);
                      }}
                      aria-label="Удалить тренировку"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-text-tertiary active:scale-90 transition-transform"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  </div>

                  {confirmId === w.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={pending}
                        className="flex h-10 flex-1 items-center justify-center rounded-xl bg-white/[0.05] text-[13px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(w.id)}
                        disabled={pending}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-crimson/15 text-[13px] font-semibold text-accent-crimson active:scale-[0.985] disabled:opacity-50"
                      >
                        <Trash2 size={13} strokeWidth={2.4} />
                        {pending ? 'Удаляю…' : 'Удалить'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      {/* Detail modal — blurred backdrop */}
      <AnimatePresence>
        {detailId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailId(null)}
              className="fixed inset-0 z-[60] bg-black/55"
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            />
            <div className="fixed inset-0 z-[61] flex items-end justify-center sm:items-center">
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                className="max-h-[82vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/[0.08] bg-bg-elevated p-5 pb-8 sm:rounded-[28px]"
                style={{ boxShadow: '0 24px 60px -16px rgba(0,0,0,0.7)' }}
              >
                {detailLoading || !detail ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-text-tertiary">
                    <Loader2 size={16} className="animate-spin" /> Загрузка…
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-crimson">
                          {detail.finished_at
                            ? fmtDate(detail.finished_at)
                            : fmtDate(detail.started_at)}
                        </div>
                        <h3 className="mt-1 text-[22px] font-bold leading-tight tracking-tight">
                          {detail.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailId(null)}
                        aria-label="Закрыть"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary active:scale-90"
                      >
                        <X size={17} strokeWidth={2.4} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { l: 'Время', v: fmtDur(detail.duration_min) },
                        { l: 'Подходов', v: String(detail.set_count) },
                        {
                          l: 'Тоннаж',
                          v: `${(detail.tonnage_kg / 1000)
                            .toFixed(1)
                            .replace('.', ',')} т`,
                        },
                      ].map((s) => (
                        <div
                          key={s.l}
                          className="rounded-2xl bg-white/[0.03] p-3 text-center"
                        >
                          <div className="text-[17px] font-bold tabular-nums leading-none">
                            {s.v}
                          </div>
                          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 space-y-3">
                      {detail.exercises.map((ex) => (
                        <div
                          key={ex.exercise_id}
                          className="rounded-2xl bg-white/[0.025] p-4"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="truncate text-[15px] font-semibold tracking-tight">
                              {ex.name}
                            </h4>
                            <span className="shrink-0 text-[11px] text-text-tertiary tabular-nums">
                              {ex.sets.length} подх.
                            </span>
                          </div>
                          <ul className="mt-2.5 space-y-1.5">
                            {ex.sets.map((st, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-3 text-[13px] tabular-nums"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-semibold text-text-tertiary">
                                  {i + 1}
                                </span>
                                <span className="text-text-secondary">
                                  <span className="font-semibold text-accent-green">
                                    {st.reps}
                                  </span>{' '}
                                  повт. ×{' '}
                                  <span className="font-semibold text-text-primary">
                                    {st.weight_kg.toString().replace('.', ',')}
                                  </span>{' '}
                                  кг
                                </span>
                                {st.is_first_set && (
                                  <span className="ml-auto rounded-full bg-accent-crimson/15 px-2 py-0.5 text-[10px] font-semibold text-accent-crimson">
                                    до отказа
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {detail.exercises.length === 0 && (
                        <p className="py-6 text-center text-[13px] text-text-tertiary">
                          В этой тренировке нет записанных подходов.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
