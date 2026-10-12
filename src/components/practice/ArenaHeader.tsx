import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ProgressBar } from '@/components/common/ProgressBar';
import { VoiceSelector } from '@/components/common/VoiceSelector';
import type { DifficultyLevel } from '@/types/practice';

export function ArenaHeader({ current, total, level }: { current: number; total: number; level: DifficultyLevel }) {
  return (
    <header className="w-full space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2.5">
          <Link
            href="/practice"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Thoát phiên luyện tập"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Thoát</span>
          </Link>
          <span className="font-medium text-slate-300">
            Câu <span className="text-white tabular-nums">{Math.min(current, total)}</span>/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <VoiceSelector />
          <Badge tone="accent">Level {level.replace('_', '–')}</Badge>
        </div>
      </div>
      <ProgressBar value={current - 1} max={total} />
    </header>
  );
}
