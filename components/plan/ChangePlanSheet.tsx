'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import {
  activatePlan,
  createCustomPlan,
  createPlanFromPreset,
  deletePlan,
  renamePlan,
} from '@/server/plan-actions';
import type { PlanSummary } from '@/server/plans';
import type { PlanPreset } from '@/server/types';
import { cn } from '@/lib/utils';
import { tapMedium, tapSuccess } from '@/lib/haptics';

interface PresetOption {
  value: PlanPreset;
  label: string;
  hint: string;
  defaultName: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    value: 'fullbody3',
    label: 'Фуллбоди 3',
    hint: '3 / неделя',
    defaultName: 'Фуллбоди · 3 раза в неделю',
  },
  {
    value: 'upper_lower',
    label: 'Верх / Низ',
    hint: '4 / неделя',
    defaultName: 'Сплит · Верх / Низ',
  },
  {
    value: 'split3',
    label: 'Сплит 3',
    hint: '3 / неделя',
    defaultName: 'Сплит · Грудь+Трицепс / Спина+Бицепс / Ноги',
  },
];

interface ChangePlanSheetProps {
  open: boolean;
  onClose: () => void;
  hasActivePlan: boolean;
  plans: PlanSummary[];
}

type InlineState =
  | { kind: 'idle' }
  | { kind: 'rename'; planId: string; value: string }
  | { kind: 'delete'; planId: string }
  | { kind: 'newCustom'; value: string }
  | { kind: 'newPreset'; preset: PlanPreset; value: string }
  | { kind: 'activateAfterCreate'; planId: string; name: string };

export function ChangePlanSheet({
  open,
  onClose,
  hasActivePlan,
  plans,
}: ChangePlanSheetProps) {
  const router = useRouter();
  const [state, setState] = useState<InlineState>({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();

  function reset() {
    setState({ kind: 'idle' });
  }

  function close() {
    reset();
    onClose();
  }

  function run<T extends { error?: string }>(
    action: () => Promise<T>,
    onSuccess: (res: T) => void,
  ) {
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      onSuccess(res);
    });
  }

  function activate(planId: string, name: string) {
    tapMedium();
    run(() => activatePlan(planId), () => {
      toast.success(`План «${name}» активирован`);
      tapSuccess();
      reset();
      router.refresh();
    });
  }

  function rename(planId: string, value: string) {
    run(() => renamePlan(planId, value), () => {
      toast.success('Название обновлено');
      reset();
      router.refresh();
    });
  }

  function remove(planId: string, name: string) {
    tapMedium();
    run(() => deletePlan(planId), () => {
      toast.success(`План «${name}» удалён`);
      tapSuccess();
      reset();
      router.refresh();
    });
  }

  function createCustom(name: string) {
    tapMedium();
    run(
      () => createCustomPlan(name),
      (res) => {
        if (res.id) {
          toast.success(`План «${name}» создан`);
          tapSuccess();
          setState({ kind: 'activateAfterCreate', planId: res.id, name });
          router.refresh();
        }
      },
    );
  }

  function createFromPreset(preset: PlanPreset, name: string) {
    tapMedium();
    run(
      () => createPlanFromPreset(name, preset),
      (res) => {
        if (res.id) {
          toast.success(`План «${name}» создан`);
          tapSuccess();
          setState({ kind: 'activateAfterCreate', planId: res.id, name });
          router.refresh();
        }
      },
    );
  }

  const canDelete = plans.length >= 2;

  return (
    <Sheet open={open} onClose={close} title="Мои планы">
      <div className="space-y-6">
        {/* Section 1: My plans */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            <Sparkles
              size={11}
              strokeWidth={2.4}
              className="mr-1 inline-block text-accent-crimson"
            />
            Мои планы
            <span className="ml-1.5 text-text-tertiary tabular-nums">
              ({plans.length})
            </span>
          </h3>

          {plans.length === 0 ? (
            <p className="mt-2.5 rounded-2xl bg-white/[0.025] px-4 py-3 text-[12px] text-text-tertiary">
              У вас пока нет планов. Создайте план ниже.
            </p>
          ) : (
            <ul className="mt-2.5 space-y-2">
              {plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  state={state}
                  setState={setState}
                  pending={isPending}
                  canDelete={canDelete}
                  onActivate={() => activate(p.id, p.name)}
                  onRename={(value) => rename(p.id, value)}
                  onDelete={() => remove(p.id, p.name)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Section 2: Create new */}
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            <Wrench
              size={11}
              strokeWidth={2.4}
              className="mr-1 inline-block text-text-secondary"
            />
            Создать новый план
          </h3>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {PRESET_OPTIONS.map((opt) => {
              const isOpen =
                state.kind === 'newPreset' && state.preset === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setState({
                      kind: 'newPreset',
                      preset: opt.value,
                      value: opt.defaultName,
                    })
                  }
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-2xl bg-white/[0.025] px-3 py-2.5 text-left transition-colors active:bg-white/[0.05]',
                    isOpen && 'ring-1 ring-accent-green/40',
                  )}
                >
                  <div className="text-[12.5px] font-semibold text-text-primary">
                    {opt.label}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary tabular-nums">
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {state.kind === 'newPreset' && (
              <motion.div
                key="newPreset"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <NameInputRow
                  message="Название нового плана"
                  value={state.value}
                  onChange={(v) =>
                    setState({ kind: 'newPreset', preset: state.preset, value: v })
                  }
                  onCancel={reset}
                  onConfirm={() =>
                    createFromPreset(state.preset, state.value)
                  }
                  pending={isPending}
                  confirmLabel="Создать"
                  tone="green"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() =>
              setState({ kind: 'newCustom', value: 'Свой план' })
            }
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/[0.10] px-4 py-3 text-[13px] font-semibold text-text-secondary transition-colors active:bg-white/[0.02]',
              state.kind === 'newCustom' && 'ring-1 ring-accent-green/30',
            )}
          >
            <Plus size={14} strokeWidth={2.4} />
            Свой план
          </button>

          <AnimatePresence initial={false}>
            {state.kind === 'newCustom' && (
              <motion.div
                key="newCustom"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <NameInputRow
                  message="Название нового плана"
                  value={state.value}
                  onChange={(v) =>
                    setState({ kind: 'newCustom', value: v })
                  }
                  onCancel={reset}
                  onConfirm={() => createCustom(state.value)}
                  pending={isPending}
                  confirmLabel="Создать"
                  tone="green"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {state.kind === 'activateAfterCreate' && (
              <motion.div
                key="activateAfterCreate"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-2xl bg-white/[0.04] p-3.5">
                  <p className="text-[12.5px] leading-relaxed text-text-secondary">
                    План «{state.name}» создан. Активировать сейчас?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={reset}
                      disabled={isPending}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl bg-white/[0.06] text-[13px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
                    >
                      Позже
                    </button>
                    <button
                      type="button"
                      onClick={() => activate(state.planId, state.name)}
                      disabled={isPending}
                      className="flex h-10 flex-[1.4] items-center justify-center rounded-xl text-[13px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
                      style={{
                        background:
                          'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                      }}
                    >
                      {isPending ? 'Активирую…' : 'Активировать'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {!hasActivePlan && plans.length > 0 && (
          <p className="rounded-2xl bg-white/[0.025] px-4 py-3 text-[12px] text-text-tertiary">
            Активного плана нет — выберите план из списка и нажмите «Активировать».
          </p>
        )}
      </div>
    </Sheet>
  );
}

interface PlanCardProps {
  plan: PlanSummary;
  state: InlineState;
  setState: (s: InlineState) => void;
  pending: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onRename: (value: string) => void;
  onDelete: () => void;
}

function PlanCard({
  plan,
  state,
  setState,
  pending,
  canDelete,
  onActivate,
  onRename,
  onDelete,
}: PlanCardProps) {
  const isRenaming = state.kind === 'rename' && state.planId === plan.id;
  const isDeleting = state.kind === 'delete' && state.planId === plan.id;

  const dateLabel = plan.created_at
    ? new Date(plan.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'overflow-hidden rounded-[22px] p-3.5',
        plan.is_active
          ? 'bg-accent-crimson/[0.06]'
          : 'bg-white/[0.025]',
      )}
      style={
        plan.is_active
          ? { boxShadow: 'inset 0 0 0 1px rgba(255,45,85,0.25)' }
          : undefined
      }
    >
      {plan.is_active && (
        <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-accent-crimson/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-crimson">
          <Check size={10} strokeWidth={3} />
          Активный
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[15px] font-semibold leading-tight text-text-primary">
            {plan.name}
          </div>
          <div className="mt-1 text-[11.5px] text-text-tertiary tabular-nums">
            {plan.workoutDays} тренировочных дней · {plan.totalExercises}{' '}
            упражнений
          </div>
          {dateLabel && (
            <div className="mt-0.5 text-[10.5px] text-text-tertiary">
              создан {dateLabel}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isRenaming && !isDeleting && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-1.5">
              {!plan.is_active && (
                <button
                  type="button"
                  onClick={onActivate}
                  disabled={pending}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
                  style={{
                    background:
                      'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                  Активировать
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setState({ kind: 'rename', planId: plan.id, value: plan.name })
                }
                className={cn(
                  'flex h-9 items-center justify-center gap-1 rounded-xl bg-white/[0.06] px-3 text-[12px] font-semibold text-text-secondary active:scale-[0.985]',
                  plan.is_active && 'flex-1',
                )}
              >
                <Pencil size={11} strokeWidth={2.4} />
                Переименовать
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setState({ kind: 'delete', planId: plan.id })}
                  className="flex h-9 items-center justify-center rounded-xl bg-accent-crimson/[0.10] px-3 text-accent-crimson active:scale-[0.985]"
                  aria-label="Удалить план"
                >
                  <Trash2 size={12} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isRenaming && (
          <motion.div
            key="rename"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <NameInputRow
              message="Новое название"
              value={state.kind === 'rename' ? state.value : ''}
              onChange={(v) =>
                setState({ kind: 'rename', planId: plan.id, value: v })
              }
              onCancel={() => setState({ kind: 'idle' })}
              onConfirm={() =>
                state.kind === 'rename' ? onRename(state.value) : undefined
              }
              pending={pending}
              confirmLabel="Сохранить"
              tone="green"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isDeleting && (
          <motion.div
            key="delete"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Удалить план «{plan.name}»?{' '}
                {plan.is_active &&
                  'Активным станет самый недавно созданный из оставшихся.'}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setState({ kind: 'idle' })}
                  disabled={pending}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-white/[0.06] text-[13px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="flex h-10 flex-[1.4] items-center justify-center rounded-xl text-[13px] font-semibold text-white active:scale-[0.985] disabled:opacity-50"
                  style={{
                    background:
                      'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
                  }}
                >
                  {pending ? 'Удаляю…' : 'Удалить'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

interface NameInputRowProps {
  message: string;
  value: string;
  onChange: (next: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  confirmLabel: string;
  tone: 'green' | 'crimson';
}

function NameInputRow({
  message,
  value,
  onChange,
  onCancel,
  onConfirm,
  pending,
  confirmLabel,
  tone,
}: NameInputRowProps) {
  const toneStyles: Record<
    NameInputRowProps['tone'],
    { bg: string; text: string }
  > = {
    green: {
      bg: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
      text: 'text-black',
    },
    crimson: {
      bg: 'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
      text: 'text-white',
    },
  };
  const s = toneStyles[tone];
  const trimmed = value.trim();
  const disabled = pending || trimmed.length === 0 || trimmed.length > 80;

  return (
    <div className="mt-3 rounded-2xl bg-white/[0.04] p-3.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
        {message}
      </label>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled) {
            e.preventDefault();
            onConfirm();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        maxLength={80}
        placeholder="Например, Силовой блок"
        className="mt-2 h-11 w-full rounded-xl bg-white/[0.06] px-3 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-green/40"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-white/[0.06] text-[13px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className={cn(
            'flex h-10 flex-[1.4] items-center justify-center rounded-xl text-[13px] font-semibold active:scale-[0.985] disabled:opacity-50',
            s.text,
          )}
          style={{ background: s.bg }}
        >
          {pending ? 'Сохраняю…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}
