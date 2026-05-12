import { BottomNav } from '@/components/nav/BottomNav';
import { RestTimerProvider } from '@/components/workout/RestTimerContext';
import { FloatingRestTimer } from '@/components/workout/FloatingRestTimer';
import { OfflineQueueProvider } from '@/components/pwa/OfflineQueueProvider';
import { OfflineBadge } from '@/components/pwa/OfflineBadge';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineQueueProvider>
      <RestTimerProvider>
        <div className="mx-auto min-h-screen max-w-md bg-bg">
          <OfflineBadge />
          <div className="safe-top pb-28">{children}</div>
          <FloatingRestTimer />
          <BottomNav />
        </div>
      </RestTimerProvider>
    </OfflineQueueProvider>
  );
}
