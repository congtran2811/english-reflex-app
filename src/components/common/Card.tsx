import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6 shadow-2xl shadow-black/40 backdrop-blur-xl', className)}
      {...props}
    />
  );
}
