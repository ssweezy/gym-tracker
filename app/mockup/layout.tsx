import { BottomNav } from '@/components/mockup/BottomNav';

export default function MockupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg">
      <div className="safe-top pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
