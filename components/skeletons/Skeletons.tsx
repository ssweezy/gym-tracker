/**
 * Suspense-fallback skeleton building blocks. Sizes intentionally match real
 * content so streaming swaps don't cause layout shift.
 */

export function Block({
  className,
  height,
  rounded = 22,
}: {
  className?: string;
  height: number;
  rounded?: number;
}) {
  return (
    <div
      className={`animate-pulse bg-white/[0.04] ${className ?? ''}`}
      style={{ height, borderRadius: rounded }}
    />
  );
}

/** Mirrors the gradient hero + stats card on the Today screen (active or idle). */
export function TodayHeroSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <Block height={180} rounded={26} />
      <Block height={140} rounded={22} />
    </div>
  );
}

/** Stack of per-exercise cards in the active workout flow. */
export function TodayExerciseListSkeleton() {
  return (
    <div className="mt-3 space-y-2.5">
      <Block height={88} rounded={22} />
      <Block height={88} rounded={22} />
      <Block height={88} rounded={22} />
    </div>
  );
}

/** Stat-tile row + heatmap card combination for Progress. */
export function ProgressStatsSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Block height={92} rounded={20} />
        <Block height={92} rounded={20} />
        <Block height={92} rounded={20} />
        <Block height={92} rounded={20} />
      </div>
      <Block height={220} rounded={22} />
    </div>
  );
}

export function ProgressRecordsSkeleton() {
  return (
    <div className="mt-3 pb-2">
      <Block height={300} rounded={22} />
    </div>
  );
}

/** Chart card placeholder for exercise progress detail. */
export function ChartCardSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="mt-3">
      <Block height={height} rounded={22} />
    </div>
  );
}

/** Three-tile row for exercise progress detail (Текущий / Рекорд / Подходов). */
export function StatTilesSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      <Block height={92} rounded={20} />
      <Block height={92} rounded={20} />
      <Block height={92} rounded={20} />
    </div>
  );
}

export function SessionsListSkeleton() {
  return (
    <div className="mt-3 pb-2">
      <Block height={260} rounded={22} />
    </div>
  );
}

/** Plan page: week timeline strip + day card. */
export function WeekTimelineSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <Block height={90} rounded={22} />
      <Block height={140} rounded={22} />
    </div>
  );
}

/** Plan page: weekly volume rows. */
export function VolumePanelSkeleton() {
  return (
    <div className="mt-3">
      <Block height={260} rounded={22} />
    </div>
  );
}
