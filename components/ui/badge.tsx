import { cn } from '@/lib/utils';

type BadgeColor = 'green' | 'crimson' | 'gray' | 'orange';

const colorMap: Record<BadgeColor, string> = {
  green: 'bg-accent-green/15 text-accent-green',
  crimson: 'bg-accent-crimson/15 text-accent-crimson',
  gray: 'bg-bg-overlay text-text-secondary',
  orange: 'bg-accent-warning/15 text-accent-warning',
};

export function Badge({ children, color = 'gray', className }: { children: React.ReactNode; color?: BadgeColor; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', colorMap[color], className)}>
      {children}
    </span>
  );
}
