import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'danger' | 'accent';
const TONES: Record<Tone, string> = {
  neutral: 'bg-white/10 text-slate-200 ring-white/15',
  success: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  danger: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
  accent: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/30',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', TONES[tone], className)}>
      {children}
    </span>
  );
}
