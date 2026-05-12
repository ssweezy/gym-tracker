'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { Input } from '@/components/ui/input';
import { setNewPassword } from './actions';

const PRIMARY_GRADIENT = 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)';
const PRIMARY_GLOW = '0 8px 24px -8px rgba(52,199,89,0.45)';

export default function RecoverPage() {
  const [pending, start] = useTransition();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pw !== pw2) {
      toast.error('Пароли не совпадают');
      return;
    }
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await setNewPassword(fd);
      if (res?.error) toast.error(res.error);
    });
  };

  return (
    <main className="px-5 pt-9">
      <Stagger className="w-full">
        <Reveal>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-green/15 text-accent-green">
            <KeyRound size={20} strokeWidth={2.2} />
          </div>
        </Reveal>

        <Reveal className="mt-4">
          <h1
            className="text-[32px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            Новый пароль
          </h1>
        </Reveal>

        <Reveal className="mt-2">
          <p className="text-[15px] text-text-secondary">
            Задайте пароль — после сохранения вы будете автоматически вошли.
          </p>
        </Reveal>

        <Reveal className="mt-7">
          <form onSubmit={onSubmit} className="space-y-2.5">
            <Input
              name="password"
              type="password"
              placeholder="Новый пароль"
              required
              minLength={6}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="h-13 rounded-2xl bg-white/[0.04] border-white/[0.06] px-4 text-[15px] focus:border-white/20"
              style={{ height: 52 }}
            />
            <Input
              type="password"
              placeholder="Повторите пароль"
              required
              minLength={6}
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="h-13 rounded-2xl bg-white/[0.04] border-white/[0.06] px-4 text-[15px] focus:border-white/20"
              style={{ height: 52 }}
            />
            <motion.button
              type="submit"
              disabled={pending || pw.length < 6 || pw !== pw2}
              whileTap={{ scale: 0.985 }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black transition-opacity disabled:opacity-50"
              style={{
                height: 52,
                background: PRIMARY_GRADIENT,
                boxShadow: PRIMARY_GLOW,
              }}
            >
              {pending ? '...' : 'Сохранить новый пароль'}
            </motion.button>
          </form>
        </Reveal>
      </Stagger>
    </main>
  );
}
