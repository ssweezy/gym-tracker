import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export default function Loading() {
  return <PageSkeleton title="Профиль" blocks={[120, 180, 140]} />;
}
