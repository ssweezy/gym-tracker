import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { BackLink } from '@/components/nav/back';
import { SettingsForm } from './form';

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, goal, unit_system, bodyweight_kg')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <Stagger className="px-5 pt-9">
      <Reveal>
        <BackLink fallback="/profile" label="Профиль" />
      </Reveal>
      <Reveal className="mt-2">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          Настройки
        </h1>
        <div className="mt-1 text-[13px] text-text-tertiary">
          Имя, цель, единицы и вес тела
        </div>
      </Reveal>

      <Reveal className="mt-6 pb-2">
        <SettingsForm
          initial={{
            display_name: profile?.display_name ?? 'Спортсмен',
            goal:
              (profile?.goal as
                | 'hypertrophy'
                | 'strength'
                | 'endurance'
                | null) ?? 'hypertrophy',
            unit_system:
              (profile?.unit_system as 'metric' | 'imperial' | null) ??
              'metric',
            bodyweight_kg: profile?.bodyweight_kg ?? null,
          }}
        />
      </Reveal>
    </Stagger>
  );
}
