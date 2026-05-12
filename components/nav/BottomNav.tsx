'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, CalendarDays, Dumbbell, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'Сегодня', icon: Home },
  { href: '/plan', label: 'План', icon: CalendarDays },
  { href: '/exercises', label: 'Тренажёры', icon: Dumbbell },
  { href: '/progress', label: 'Прогресс', icon: TrendingUp },
  { href: '/profile', label: 'Профиль', icon: User },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

// Routes that take over the bottom of the viewport with their own CTA — hide nav.
const HIDDEN_ON: readonly string[] = ['/workout/new'];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-auto max-w-md">
        <div
          className="border-t border-white/[0.06] bg-bg/70 backdrop-blur-2xl backdrop-saturate-150"
          style={{
            WebkitBackdropFilter: 'blur(32px) saturate(150%)',
          }}
        >
          <ul className="grid grid-cols-5 px-1.5 pt-1.5 pb-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="group relative flex flex-col items-center gap-[3px] rounded-2xl px-1 pt-2 pb-[10px] transition-colors"
                  >
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.4 : 1.8}
                      className={cn(
                        'transition-colors',
                        active
                          ? 'text-text-primary'
                          : 'text-text-tertiary group-hover:text-text-secondary',
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] leading-none tracking-tight transition-colors',
                        active
                          ? 'font-semibold text-text-primary'
                          : 'font-medium text-text-tertiary group-hover:text-text-secondary',
                      )}
                    >
                      {label}
                    </span>
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute bottom-0.5 h-[2px] w-6 rounded-full bg-accent-crimson"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
