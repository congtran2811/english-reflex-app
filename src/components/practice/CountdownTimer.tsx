import { cn } from '@/lib/utils';
import { TURN_DURATION_SECONDS } from '@/lib/constants';

const R = 54;
const C = 2 * Math.PI * R;

/** Radial countdown; colour shifts indigo → amber → rose as time runs out. */
export function CountdownTimer({ timeLeft, total = TURN_DURATION_SECONDS, paused = false }: { timeLeft: number; total?: number; paused?: boolean }) {
  const ratio = Math.max(0, Math.min(1, timeLeft / total));
  const color = ratio > 0.5 ? 'text-indigo-400' : ratio > 0.25 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className={cn('relative h-28 w-28 sm:h-36 sm:w-36', ratio <= 0.25 && !paused && 'animate-pulse')} aria-label={`${Math.ceil(timeLeft)} seconds left`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} className="fill-none stroke-white/10" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={R}
          className={cn('fill-none stroke-current transition-colors', color)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl sm:text-4xl font-bold tabular-nums', color)}>{Math.ceil(timeLeft)}</span>
        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400">{paused ? 'paused' : 'seconds'}</span>
      </div>
    </div>
  );
}
