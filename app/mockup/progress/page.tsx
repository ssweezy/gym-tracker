'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Dumbbell, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Stagger, Reveal } from '@/components/mockup/Stagger';
import { cn } from '@/lib/utils';

const stats = [
  { label: 'Тренировок', value: '12', sub: 'за май', icon: Dumbbell, color: 'text-text-primary', dot: '#FFFFFF' },
  { label: 'Серия', value: '5', sub: 'дней', icon: Flame, color: 'text-accent-crimson', dot: '#FF2D55' },
  { label: 'Тонн', value: '18,4', sub: 'поднято', icon: TrendingUp, color: 'text-accent-green', dot: '#34C759' },
];

const heatmap: number[][] = [
  [0, 0, 1, 0, 2, 0, 0],
  [1, 0, 2, 0, 2, 0, 0],
  [2, 0, 1, 0, 3, 0, 0],
  [2, 0, 2, 0, 2, 0, 0],
  [3, 0, 2, 0, 3, 0, 0],
  [2, 0, 0, 0, 2, 0, 0],
  [0, 0, 1, 0, 0, 0, 0],
  [2, 0, 3, 0, 2, 0, 0],
  [2, 0, 2, 0, 3, 0, 0],
  [3, 0, 2, 0, 0, 0, 0],
  [2, 0, 3, 0, 3, 0, 0],
  [2, 0, 1, 0, 0, 0, 0],
];

const intensityStyle = (n: number): React.CSSProperties => {
  if (n === 0) return { backgroundColor: 'rgba(255,255,255,0.04)' };
  if (n === 1) return { backgroundColor: 'rgba(52,199,89,0.28)' };
  if (n === 2) return { backgroundColor: 'rgba(52,199,89,0.6)' };
  return { backgroundColor: '#34C759', boxShadow: '0 0 12px -2px rgba(52,199,89,0.6)' };
};

interface ExerciseProgress {
  name: string;
  current: string;
  unit: string;
  delta: string;
  positive: boolean;
  weeksAgo: number;
  points: number[];
}

const exercises: ExerciseProgress[] = [
  { name: 'Жим лёжа', current: '62,5', unit: 'кг', delta: '+2,5', positive: true, weeksAgo: 3, points: [55, 57, 57, 60, 60, 62, 62.5] },
  { name: 'Присед со штангой', current: '90', unit: 'кг', delta: '+5', positive: true, weeksAgo: 4, points: [75, 78, 80, 82, 85, 88, 90] },
  { name: 'Становая тяга', current: '110', unit: 'кг', delta: '0', positive: false, weeksAgo: 1, points: [105, 108, 110, 110, 110, 110, 110] },
  { name: 'Жим стоя', current: '40', unit: 'кг', delta: '+2,5', positive: true, weeksAgo: 5, points: [32, 33, 35, 35, 37, 39, 40] },
  { name: 'Подтягивания', current: '12', unit: 'повт.', delta: '+1', positive: true, weeksAgo: 2, points: [8, 9, 9, 10, 10, 11, 12] },
];

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const w = 100;
  const h = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return [x, y] as [number, number];
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const [lastX, lastY] = coords[coords.length - 1];
  const color = positive ? '#34C759' : '#6E6E73';
  const fillId = `spark-fill-${useId().replace(/:/g, '')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${fillId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={2.5}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.85, duration: 0.3 }}
      />
    </svg>
  );
}

export default function ProgressMockup() {
  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <div className="text-[13px] font-medium text-text-tertiary">Май 2026</div>
        <h1
          className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          Прогресс
        </h1>
      </Reveal>

      {/* Stat tiles */}
      <Reveal className="mt-6">
        <div className="grid grid-cols-3 gap-2">
          {stats.map(({ label, value, sub, icon: Icon, color, dot }) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-[20px] bg-bg-elevated p-3.5"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={12} className={color} strokeWidth={2.4} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  {label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn('text-[26px] font-bold tabular-nums leading-none tracking-tight', color)}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {value}
                </span>
              </div>
              <div className="mt-1 text-[10.5px] text-text-tertiary">{sub}</div>
              <span
                className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: dot, boxShadow: `0 0 8px 0 ${dot}88` }}
              />
            </div>
          ))}
        </div>
      </Reveal>

      {/* Heatmap */}
      <Reveal className="mt-3">
        <div
          className="overflow-hidden rounded-[22px] p-5"
          style={{
            background:
              'radial-gradient(120% 80% at 100% 0%, rgba(52,199,89,0.08) 0%, rgba(52,199,89,0) 60%), #131316',
          }}
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              Активность
            </h2>
            <span className="text-[11px] text-text-tertiary">12 недель</span>
          </div>

          <div className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px] justify-items-center">
            {heatmap.flatMap((week, wi) =>
              week.map((intensity, di) => (
                <motion.div
                  key={`${wi}-${di}`}
                  className="h-3.5 w-3.5 rounded-[3px]"
                  style={intensityStyle(intensity)}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.32,
                    delay: 0.1 + wi * 0.022 + di * 0.005,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              )),
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10.5px] text-text-tertiary">
            <span>меньше</span>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(0)} />
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(1)} />
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(2)} />
              <span className="h-2.5 w-2.5 rounded-[2px]" style={intensityStyle(3)} />
            </div>
            <span>больше</span>
          </div>
        </div>
      </Reveal>

      {/* Records header */}
      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Рабочие веса
        </h2>
        <button className="text-[12px] font-semibold text-accent-crimson">Все</button>
      </Reveal>

      {/* Records list */}
      <Reveal className="mt-3 pb-2">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          <ul className="divide-y divide-white/[0.04]">
            {exercises.map((ex, i) => (
              <motion.li
                key={ex.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.05 + i * 0.035 }}
              >
                <button className="block w-full px-4 py-3.5 text-left active:bg-white/[0.03] transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                        {ex.name}
                      </h3>
                      <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                        <span className="text-[18px] font-semibold leading-none">
                          {ex.current}
                          <span className="ml-0.5 text-[11px] text-text-tertiary">{ex.unit}</span>
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 text-[11px] font-semibold',
                            ex.positive ? 'text-accent-green' : 'text-text-tertiary',
                          )}
                        >
                          {ex.positive ? <ArrowUpRight size={10} strokeWidth={3} /> : null}
                          {ex.delta}
                          <span className="ml-1 text-text-tertiary font-normal">
                            · {ex.weeksAgo}н
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Sparkline points={ex.points} positive={ex.positive} />
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-text-tertiary" />
                  </div>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Stagger>
  );
}
