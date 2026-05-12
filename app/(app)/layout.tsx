import { BottomNav } from '@/components/nav/BottomNav';
import { RestTimerProvider } from '@/components/workout/RestTimerContext';
import { FloatingRestTimer } from '@/components/workout/FloatingRestTimer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestTimerProvider>
      <div className="mx-auto min-h-screen max-w-md bg-bg">
        <div className="safe-top pb-28">{children}</div>
        <FloatingRestTimer />
        <BottomNav />
      </div>
    </RestTimerProvider>
  );
}
