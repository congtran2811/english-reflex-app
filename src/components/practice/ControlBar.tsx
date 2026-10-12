import { Button } from '@/components/common/Button';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

export function ControlBar({
  paused,
  hasText,
  onTogglePause,
  onSubmit,
  onReset,
}: {
  paused: boolean;
  hasText?: boolean;
  onTogglePause: () => void;
  onSubmit: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
      <Button
        id="btn-toggle-pause"
        variant="secondary"
        onClick={onTogglePause}
        className="flex-1 sm:flex-initial min-w-[90px] py-2 sm:py-2.5 px-3 text-xs sm:text-sm"
      >
        {paused ? <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
        <span>{paused ? 'Resume' : 'Pause'}</span>
        <kbd className="ml-1 hidden sm:inline-flex rounded bg-white/10 px-1.5 text-[10px] text-slate-400">Space</kbd>
      </Button>

      {onReset && (
        <Button
          id="btn-reset-speech"
          variant="secondary"
          onClick={onReset}
          disabled={paused || !hasText}
          className="flex-1 sm:flex-initial min-w-[90px] border-amber-500/30 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-200 disabled:opacity-40 py-2 sm:py-2.5 px-3 text-xs sm:text-sm"
          title="Xóa bản nhận diện hiện tại để nói lại (Phím R)"
        >
          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Nói lại</span>
          <kbd className="ml-1 hidden sm:inline-flex rounded bg-white/10 px-1.5 text-[10px] text-amber-300/70">R</kbd>
        </Button>
      )}

      <Button
        id="btn-submit-turn"
        onClick={onSubmit}
        disabled={paused}
        className="flex-1 sm:flex-initial min-w-[90px] py-2 sm:py-2.5 px-3 text-xs sm:text-sm"
      >
        <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>Next</span>
        <kbd className="ml-1 hidden sm:inline-flex rounded bg-white/20 px-1.5 text-[10px]">Enter</kbd>
      </Button>
    </div>
  );
}
