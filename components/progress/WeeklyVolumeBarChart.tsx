'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

export interface WeeklyVolumePoint {
  /** Short label like "DD.MM" */
  label: string;
  /** Total tonnage for the week (weight_kg × reps summed) */
  volume: number;
}

type ChartDatum = WeeklyVolumePoint;

function ChartTooltip({
  active,
  payload,
}: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload as ChartDatum | undefined;
  if (!datum) return null;
  const tonnes = datum.volume / 1000;
  return (
    <div
      className="rounded-[12px] border border-white/[0.06] bg-bg-elevated px-3 py-2 shadow-lg"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
        с {datum.label}
      </div>
      <div className="mt-1 flex items-baseline gap-1 tabular-nums">
        <span className="text-[16px] font-semibold leading-none text-accent-green">
          {tonnes >= 1
            ? tonnes.toFixed(1).replace('.', ',')
            : datum.volume.toFixed(0)}
        </span>
        <span className="text-[11px] text-text-tertiary">
          {tonnes >= 1 ? 'т' : 'кг'}
        </span>
      </div>
    </div>
  );
}

interface Props {
  weeks: WeeklyVolumePoint[];
}

export function WeeklyVolumeBarChart({ weeks }: Props) {
  const hasAny = weeks.some((w) => w.volume > 0);
  if (!hasAny) {
    return (
      <div className="flex h-36 items-center justify-center rounded-[20px] bg-bg-elevated/60 text-[13px] text-text-tertiary">
        Недостаточно данных за 12 недель
      </div>
    );
  }

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={weeks}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            stroke="#1F1F1F"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="#6E6E73"
            fontSize={10.5}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            stroke="#6E6E73"
            fontSize={10.5}
            tickLine={false}
            axisLine={false}
            width={34}
            unit=" кг"
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} />}
            cursor={{ fill: 'rgba(52,199,89,0.08)' }}
          />
          <Bar
            dataKey="volume"
            fill="#34C759"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
