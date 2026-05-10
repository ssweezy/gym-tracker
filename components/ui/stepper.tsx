'use client';
import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  precision?: number;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  unit,
  precision = 0,
  className,
}: StepperProps) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(precision)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(precision)));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        onClick={dec}
        disabled={value <= min}
        className="h-12 w-12 rounded-full bg-bg-elevated text-text-primary flex items-center justify-center active:scale-95 disabled:opacity-30 transition-transform"
        aria-label="Уменьшить"
      >
        <Minus size={20} />
      </button>
      <motion.div
        key={value}
        initial={{ scale: 0.92, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="min-w-[88px] text-center text-3xl font-semibold tabular-nums"
      >
        {value.toFixed(precision)}{unit && <span className="text-text-secondary text-lg ml-1">{unit}</span>}
      </motion.div>
      <button
        onClick={inc}
        disabled={value >= max}
        className="h-12 w-12 rounded-full bg-bg-elevated text-text-primary flex items-center justify-center active:scale-95 disabled:opacity-30 transition-transform"
        aria-label="Увеличить"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
