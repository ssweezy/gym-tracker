import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listExercises } from '@/server/exercises';
import { listWorkoutTemplates } from '@/server/plans';
import { AdHocBuilder } from './builder';

export default async function NewAdHocWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [exercises, templates] = await Promise.all([
    listExercises({}),
    listWorkoutTemplates(user.id),
  ]);

  return (
    <AdHocBuilder
      exercises={exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        muscle_groups: ex.muscle_groups,
        is_system: ex.is_system ?? true,
      }))}
      templates={templates}
    />
  );
}
