import { Block } from './Skeletons';

/**
 * Route-level fallback rendered by `loading.tsx`. Next prefetches it for
 * dynamic routes, so a tap on a link swaps to this shell instantly instead of
 * freezing on the old page until the server responds. Mirrors the shared page
 * header (eyebrow + 34px title) so the real page streams in without a jump.
 */
export function PageSkeleton({
  title,
  blocks = [180, 140, 88],
}: {
  /** Known page title; omitted → a placeholder bar. */
  title?: string;
  /** Heights of the content placeholders below the header. */
  blocks?: number[];
}) {
  return (
    <div className="px-5 pt-9" aria-busy="true">
      <Block height={16} rounded={6} className="w-32" />
      {title ? (
        <h1
          className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          {title}
        </h1>
      ) : (
        <Block height={36} rounded={10} className="mt-2 w-48" />
      )}
      <div className="mt-6 space-y-3">
        {blocks.map((h, i) => (
          <Block key={i} height={h} />
        ))}
      </div>
    </div>
  );
}
