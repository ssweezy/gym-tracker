'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from './actions';

const PRIMARY_GRADIENT = 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)';
const PRIMARY_GLOW = '0 8px 24px -8px rgba(52,199,89,0.45)';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await requestPasswordReset(fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSent(true);
    });
  };

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <Stagger className="w-full">
        <Reveal>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary hover:text-text-secondary"
          >
            <ArrowLeft size={14} /> Войти
          </Link>
        </Reveal>

        <Reveal className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            Восстановление
          </div>
        </Reveal>

        <Reveal className="mt-3">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            {sent ? 'Письмо отправлено' : 'Забыли пароль?'}
          </h1>
        </Reveal>

        <Reveal className="mt-2">
          <p className="text-[15px] text-text-secondary">
            {sent
              ? 'Если этот email зарегистрирован, мы отправили на него ссылку для сброса. Перейдите по ней — там можно задать новый пароль.'
              : 'Введите email — пришлём ссылку для сброса пароля.'}
          </p>
        </Reveal>

        {sent ? (
          <Reveal className="mt-8">
            <div className="flex items-center gap-3 rounded-2xl bg-accent-green/12 px-4 py-3.5">
              <Check size={18} strokeWidth={2.6} className="text-accent-green" />
              <span className="text-[13.5px] text-accent-green">
                Проверьте почту (и папку «Спам»)
              </span>
            </div>
            <Link
              href="/login"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary transition-colors hover:bg-white/[0.08]"
            >
              Вернуться к входу
            </Link>
          </Reveal>
        ) : (
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
                {pending ? '...' : 'Отправить ссылку'}
              </motion.button>
            </form>
          </Reveal>
        )}
      </Stagger>
    </main>
  );
}
