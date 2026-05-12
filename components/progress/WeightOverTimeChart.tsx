'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

export interface WeightOverTimePoint {
  /** ISO timestamp of the set */
  x: string;
  weight: number;
  reps: number;
}

const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
};

const formatTooltipDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

type ChartDatum = WeightOverTimePoint;

function ChartTooltip({
  active,
  payload,
}: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload as ChartDatum | undefined;
  if (!datum) return null;
  return (
    <div
      className="rounded-[12px] border border-white/[0.06] bg-bg-elevated px-3 py-2 shadow-lg"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
        {formatTooltipDate(datum.x)}
      </div>
      <div className="mt-1 flex items-baseline gap-1 tabular-nums">
        <span className="text-[16px] font-semibold leading-none text-accent-green">
          {datum.weight.toString().replace('.', ',')}
        </span>
        <span className="text-[11px] text-text-tertiary">кг</span>
        <span className="mx-1 text-[11px] text-text-tertiary">×</span>
        <span className="text-[14px] font-semibold leading-none text-text-primary">
          {datum.reps}
        </span>
        <span className="text-[11px] text-text-tertiary">повт.</span>
      </div>
    </div>
  );
}

interface Props {
  points: WeightOverTimePoint[];
}

export function WeightOverTimeChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[20px] bg-bg-elevated/60 text-[13px] text-text-tertiary">
        Пока нет подходов
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34C759" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#34C759" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#1F1F1F"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="x"
            tickFormatter={formatShortDate}
            stroke="#6E6E73"
            fontSize={10.5}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            stroke="#6E6E73"
            fontSize={10.5}
            tickLine={false}
            axisLine={false}
            width={34}
            unit=" кг"
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} />}
            cursor={{ stroke: '#34C759', strokeOpacity: 0.4, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#34C759"
            strokeWidth={2}
            fill="url(#weight-fill)"
            dot={{ r: 3, fill: '#34C759', stroke: 'none' }}
            activeDot={{ r: 5, fill: '#34C759', stroke: '#0A0A0A', strokeWidth: 2 }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
