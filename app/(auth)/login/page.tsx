'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { Input } from '@/components/ui/input';
import { authWithCredentials, signInWithGoogle } from './actions';

const PRIMARY_GRADIENT = 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)';
const PRIMARY_GLOW = '0 8px 24px -8px rgba(52,199,89,0.45)';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [pending, start] = useTransition();
  const [googlePending, startGoogle] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('mode', mode);
    start(async () => {
      const res = await authWithCredentials(fd);
      if (res?.error) toast.error(res.error);
    });
  };

  const onGoogle = () => {
    startGoogle(async () => {
      const res = await signInWithGoogle();
      if (res?.error) toast.error(res.error);
    });
  };

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <Stagger className="w-full">
        <Reveal>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            Gym Tracker
          </div>
        </Reveal>

        <Reveal className="mt-3">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01", "tnum"' }}
          >
            {mode === 'signin' ? 'С возвращением' : 'Создайте аккаунт'}
          </h1>
        </Reveal>

        <Reveal className="mt-2">
          <p className="text-[15px] text-text-secondary">
            {mode === 'signin'
              ? 'Войдите, чтобы продолжить тренировки.'
              : 'Начнём с email и пароля — это займёт минуту.'}
          </p>
        </Reveal>

        <Reveal className="mt-8">
          <form onSubmit={onSubmit} className="space-y-2.5">
            <Input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              inputMode="email"
              className="h-13 rounded-2xl bg-white/[0.04] border-white/[0.06] px-4 text-[15px] focus:border-white/20"
              style={{ height: 52 }}
            />
            <Input
              name="password"
              type="password"
              placeholder="Пароль"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="h-13 rounded-2xl bg-white/[0.04] border-white/[0.06] px-4 text-[15px] focus:border-white/20"
              style={{ height: 52 }}
            />

            <motion.button
              type="submit"
              disabled={pending}
              whileTap={{ scale: 0.985 }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black transition-opacity disabled:opacity-60"
              style={{
                height: 52,
                background: PRIMARY_GRADIENT,
                boxShadow: PRIMARY_GLOW,
              }}
            >
              {pending
                ? '...'
                : mode === 'signin'
                  ? 'Войти'
                  : 'Зарегистрироваться'}
            </motion.button>
          </form>
        </Reveal>

        <Reveal className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
            или
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </Reveal>

        <Reveal>
          <motion.button
            type="button"
            onClick={onGoogle}
            disabled={googlePending}
            whileTap={{ scale: 0.985 }}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white/[0.05] text-[15px] font-semibold text-text-primary transition-colors hover:bg-white/[0.07] disabled:opacity-60"
            style={{ height: 52 }}
          >
            <GoogleMark />
            {googlePending ? '...' : 'Войти через Google'}
          </motion.button>
        </Reveal>

        <Reveal className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-[13.5px] text-text-secondary transition-colors hover:text-text-primary"
          >
            {mode === 'signin' ? (
              <>
                Нет аккаунта?{' '}
                <span className="font-semibold text-accent-green">Зарегистрироваться</span>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <span className="font-semibold text-accent-green">Войти</span>
              </>
            )}
          </button>
        </Reveal>
      </Stagger>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.78 2.71v2.25h2.88c1.68-1.55 2.7-3.83 2.7-6.6z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.88-2.25c-.8.54-1.83.86-3.08.86-2.37 0-4.38-1.6-5.1-3.75H.94v2.32A8.99 8.99 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.9 10.68a5.4 5.4 0 0 1 0-3.45V4.9H.94a9 9 0 0 0 0 8.1l2.96-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.55-2.55C13.46.88 11.43 0 9 0A8.99 8.99 0 0 0 .94 4.9L3.9 7.23C4.62 5.07 6.63 3.58 9 3.58z"
      />
    </svg>
  );
}
