'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToggleProps {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  label: string;
  className?: string;
}

export function Toggle({ pressed, onPressedChange, label, className }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors',
        pressed ? 'bg-accent-green/15 text-accent-green' : 'bg-bg-elevated text-text-secondary',
        className,
      )}
    >
      <motion.span
        animate={{ scale: pressed ? 1 : 0.85, opacity: pressed ? 1 : 0.5 }}
        transition={{ duration: 0.18 }}
        className={cn('h-2 w-2 rounded-full', pressed ? 'bg-accent-green' : 'bg-text-tertiary')}
      />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
