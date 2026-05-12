'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MuscleFocusOverlay,
  type FocusDayBreakdown,
} from './MuscleFocusOverlay';
import { cn } from '@/lib/utils';
import {
  MUSCLE_LABELS,
  type MuscleGroup,
  type VolumeStatus,
} from '@/lib/volume';

export interface VolumeRow {
  group: MuscleGroup;
  sets: number;
  status: VolumeStatus;
}

export interface BreakdownExercise {
  name: string;
  target_sets: number;
  muscle_groups: string[];
}

export interface BreakdownDay {
  id: string;
  weekday: number;
  title: string | null;
  is_rest: boolean;
  exercises: BreakdownExercise[];
}

interface WeeklyVolumePanelProps {
  rows: VolumeRow[];
  days?: BreakdownDay[];
}

const statusColor: Record<VolumeStatus, string> = {
  under: '#6E6E73',
  optimal: '#34C759',
  over: '#FF9500',
};

const statusTextColor: Record<VolumeStatus, string> = {
  under: 'text-text-tertiary',
  optimal: 'text-accent-green',
  over: 'text-accent-warning',
};

const statusLabel: Record<VolumeStatus, string> = {
  under: 'мало',
  optimal: 'норма',
  over: 'много',
};

export function WeeklyVolumePanel({ rows, days = [] }: WeeklyVolumePanelProps) {
  const [openGroup, setOpenGroup] = useState<MuscleGroup | null>(null);

  const breakdown = useMemo<FocusDayBreakdown[]>(() => {
    if (!openGroup) return [];
    const result: FocusDayBreakdown[] = [];
    for (const day of days) {
      if (day.is_rest) continue;
      let setCount = 0;
      const contribs: Array<{ name: string; target_sets: number }> = [];
      for (const ex of day.exercises) {
        if (ex.muscle_groups.includes(openGroup)) {
          contribs.push({ name: ex.name, target_sets: ex.target_sets });
          setCount += ex.target_sets;
        }
      }
      if (contribs.length > 0) {
        result.push({
          weekday: day.weekday,
          title: day.title,
          setCount,
          contributions: contribs,
        });
      }
    }
    return result;
  }, [openGroup, days]);

  const openRow = useMemo(
    () => rows.find((r) => r.group === openGroup) ?? null,
    [openGroup, rows],
  );

  return (
    <>
      <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
        <ul className="divide-y divide-white/[0.04]">
          {rows.map((v, i) => {
            const fillPct = Math.min(100, (v.sets / 12) * 100);
            return (
              <motion.li
                key={v.group}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.36,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.05 + i * 0.04,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(v.group)}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
                >
                  <div className="w-[88px] text-[14px] font-medium">
                    {MUSCLE_LABELS[v.group]}
                  </div>
                  <div className="flex-1">
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <span className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
                      <span className="absolute inset-y-0 left-[83.33%] w-px bg-white/15" />
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ backgroundColor: statusColor[v.status] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPct}%` }}
                        transition={{
                          duration: 0.9,
                          ease: [0.22, 1, 0.36, 1],
                          delay: 0.1 + i * 0.03,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex w-[68px] items-baseline justify-end gap-1.5 tabular-nums">
                    <span
                      className={cn(
                        'text-[18px] font-semibold leading-none',
                        statusTextColor[v.status],
                      )}
                    >
                      {v.sets}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium uppercase tracking-wide',
                        statusTextColor[v.status],
                      )}
                    >
                      {statusLabel[v.status]}
                    </span>
                  </div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <MuscleFocusOverlay
        open={openGroup !== null}
        onClose={() => setOpenGroup(null)}
        muscleGroup={openGroup}
        totalSets={openRow?.sets ?? 0}
        breakdown={breakdown}
      />
    </>
  );
}
