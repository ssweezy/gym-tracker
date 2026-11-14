import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export default function Loading() {
  return <PageSkeleton title="Тренажёры" blocks={[44, 88, 88, 88]} />;
}
