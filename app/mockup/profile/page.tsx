'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Scale,
  Ruler,
  Download,
  Bell,
  Info,
  LogOut,
  ChevronRight,
  Calendar,
  Trophy,
  Settings,
} from 'lucide-react';
import { Stagger, Reveal } from '@/components/mockup/Stagger';
import { cn } from '@/lib/utils';

const profile = {
  name: 'Аслан',
  goal: 'Гипертрофия',
  joined: 'С марта 2026',
};

const yearStats = [
  { value: '146', label: 'Тренировок', color: 'text-text-primary' },
  { value: '42', label: 'Серия дн.', color: 'text-accent-crimson' },
  { value: '184', label: 'Тонн', color: 'text-accent-green' },
];

interface SettingRow {
  icon: typeof Target;
  label: string;
  value?: string;
  iconBg: string;
  iconColor: string;
  destructive?: boolean;
}

const trainingSettings: SettingRow[] = [
  { icon: Target, label: 'Цель', value: 'Гипертрофия', iconBg: 'rgba(255,45,85,0.15)', iconColor: '#FF2D55' },
  { icon: Scale, label: 'Вес тела', value: '78,4 кг', iconBg: 'rgba(52,199,89,0.15)', iconColor: '#34C759' },
  { icon: Ruler, label: 'Единицы', value: 'Метрические', iconBg: 'rgba(142,142,147,0.2)', iconColor: '#A1A1A6' },
  { icon: Bell, label: 'Напоминания', value: 'Включены', iconBg: 'rgba(255,149,0,0.15)', iconColor: '#FF9500' },
];

const dataSettings: SettingRow[] = [
  { icon: Download, label: 'Экспорт CSV', iconBg: 'rgba(10,132,255,0.15)', iconColor: '#0A84FF' },
  { icon: Info, label: 'О приложении', value: 'v0.1.0', iconBg: 'rgba(142,142,147,0.2)', iconColor: '#A1A1A6' },
];

function SettingsCard({ items, delay = 0 }: { items: SettingRow[]; delay?: number }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
      <ul className="divide-y divide-white/[0.04]">
        {items.map((row, i) => {
          const Icon = row.icon;
          return (
            <motion.li
              key={row.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: delay + i * 0.04 }}
            >
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03] transition-colors">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: row.iconBg }}
                >
                  <Icon size={14} strokeWidth={2.2} style={{ color: row.iconColor }} />
                </div>
                <span className="flex-1 text-[15px] font-medium tracking-tight">{row.label}</span>
                {row.value && (
                  <span className="text-[13px] text-text-secondary tabular-nums">{row.value}</span>
                )}
                <ChevronRight size={15} className="text-text-tertiary shrink-0" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ProfileMockup() {
  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <div className="text-[13px] font-medium text-text-tertiary">Аккаунт</div>
        <h1
          className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          Профиль
        </h1>
      </Reveal>

      {/* Hero profile */}
      <Reveal className="mt-6">
        <div
          className="overflow-hidden rounded-[26px] p-5"
          style={{
            background:
              'radial-gradient(110% 90% at 0% 0%, rgba(255,45,85,0.12) 0%, rgba(255,45,85,0) 55%), radial-gradient(90% 80% at 100% 100%, rgba(52,199,89,0.10) 0%, rgba(52,199,89,0) 55%), #131316',
          }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative shrink-0"
            >
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
                style={{
                  background: 'conic-gradient(from 220deg, #FF2D55, #FF9500, #34C759, #0A84FF, #FF2D55)',
                  padding: 3,
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-bg">
                  <span className="text-[28px] font-bold tracking-tight">{profile.name[0]}</span>
                </div>
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-green ring-2 ring-bg"
                style={{ boxShadow: '0 0 12px -2px rgba(52,199,89,0.7)' }}
              >
                <Trophy size={10} strokeWidth={2.8} className="text-black" />
              </span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight truncate">
                {profile.name}
              </h2>
              <div className="mt-0.5 text-[13.5px] text-text-secondary">{profile.goal}</div>
              <div className="text-[11.5px] text-text-tertiary">{profile.joined}</div>
            </div>
            <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] active:scale-95 transition-transform">
              <Settings size={16} className="text-text-secondary" strokeWidth={2.2} />
            </button>
          </div>

          {/* Inline stat row */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-[18px] bg-black/30 p-2.5">
            {yearStats.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className={cn('text-[22px] font-bold tabular-nums leading-none tracking-tight', s.color)}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {s.value}
                </div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Active plan */}
      <Reveal className="mt-3">
        <button className="block w-full overflow-hidden rounded-[22px] bg-bg-elevated p-5 text-left active:scale-[0.995] transition-transform">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-accent-crimson" strokeWidth={2.4} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                  Активный план
                </span>
              </div>
              <h3 className="mt-1.5 text-[19px] font-semibold leading-tight tracking-tight">
                Сплит 3 в неделю
              </h3>
              <div className="mt-1 text-[12px] text-text-tertiary">
                3 тренировки · Активен 6 недель
              </div>
            </div>
            <ChevronRight size={18} className="text-text-tertiary shrink-0" />
          </div>
        </button>
      </Reveal>

      {/* Training settings */}
      <Reveal className="mt-7">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Тренировки
        </h3>
        <SettingsCard items={trainingSettings} delay={0.05} />
      </Reveal>

      {/* Data settings */}
      <Reveal className="mt-5">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Данные
        </h3>
        <SettingsCard items={dataSettings} delay={0.08} />
      </Reveal>

      {/* Logout */}
      <Reveal className="mt-5">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-crimson/12 text-[14px] font-semibold text-accent-crimson active:bg-accent-crimson/18 transition-colors">
          <LogOut size={15} strokeWidth={2.4} />
          Выйти
        </button>
      </Reveal>

      <Reveal className="mt-5 text-center text-[11px] text-text-tertiary pb-2">
        Gym Tracker · 0.1.0
      </Reveal>
    </Stagger>
  );
}
