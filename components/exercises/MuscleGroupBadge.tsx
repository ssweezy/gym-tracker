import { cn } from '@/lib/utils';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';

const MUSCLE_HUE: Record<MuscleGroup, number> = {
  chest: 348,
  back: 210,
  shoulders: 195,
  biceps: 260,
  triceps: 280,
  forearms: 230,
  quads: 142,
  hamstrings: 95,
  glutes: 28,
  calves: 50,
  abs: 12,
  cardio: 0,
};

export function muscleHue(group: string): number {
  return MUSCLE_HUE[group as MuscleGroup] ?? 220;
}

export function muscleLabel(group: string): string {
  return MUSCLE_LABELS[group as MuscleGroup] ?? group;
}

interface MuscleGroupBadgeProps {
  group: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function MuscleGroupBadge({ group, size = 'sm', className }: MuscleGroupBadgeProps) {
  const hue = muscleHue(group);
  const label = muscleLabel(group);
  const fontSize = size === 'md' ? 'text-[12px]' : 'text-[11px]';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 font-medium tabular-nums',
        fontSize,
        className,
      )}
      style={{
        backgroundColor: `hsla(${hue}, 70%, 55%, 0.12)`,
        color: `hsl(${hue}, 75%, 70%)`,
        boxShadow: `inset 0 0 0 1px hsla(${hue}, 70%, 60%, 0.16)`,
      }}
    >
      {label}
    </span>
  );
}
