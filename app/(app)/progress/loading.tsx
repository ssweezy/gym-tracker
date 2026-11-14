import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export default function Loading() {
  return <PageSkeleton title="Прогресс" blocks={[92, 220, 300]} />;
}
