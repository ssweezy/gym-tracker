'use client';

import { useState } from 'react';
import { Library } from 'lucide-react';
import { ChangePlanSheet } from './ChangePlanSheet';
import type { PlanSummary } from '@/server/plans';

interface ChangePlanButtonProps {
  hasActivePlan: boolean;
  plans: PlanSummary[];
}

export function ChangePlanButton({ hasActivePlan, plans }: ChangePlanButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-white/[0.08] active:scale-95"
      >
        <Library size={12} strokeWidth={2.2} />
        Мои планы
      </button>
      <ChangePlanSheet
        open={open}
        onClose={() => setOpen(false)}
        hasActivePlan={hasActivePlan}
        plans={plans}
      />
    </>
  );
}
