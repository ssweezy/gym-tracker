import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export default function Loading() {
  return <PageSkeleton title="На этой неделе" blocks={[90, 140, 260]} />;
}
