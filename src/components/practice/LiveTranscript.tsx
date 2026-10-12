import { cn } from '@/lib/utils';
import { Mic, MicOff, RotateCcw } from 'lucide-react';

/** Recording indicator with live volume VU meter + animated wave bars + live STT text + reset text button. */
export function LiveTranscript({
  finalText,
  interimText,
  listening,
  audioLevel = 0,
  onReset,
}: {
  finalText: string;
  interimText: string;
  listening: boolean;
  audioLevel?: number;
  onReset?: () => void;
}) {
  const empty = !finalText && !interimText;
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 sm:p-4">
      <div className="mb-1.5 sm:mb-2 flex items-center gap-2 text-xs font-medium">
        {listening ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            <Mic className="h-3.5 w-3.5 text-rose-300" />
            <span className="text-rose-200">Listening…</span>

            {/* Live Volume Meter Bar */}
            <div className="ml-1 sm:ml-2 hidden xs:flex items-center gap-1.5" title={`Âm lượng mic: ${audioLevel}%`}>
              <div className="h-2 w-12 sm:w-16 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(audioLevel * 1.5, audioLevel > 0 ? 8 : 0))}%` }}
                />
              </div>
            </div>

            {/* Reset / Say again button if there is text recognized */}
            {onReset && !empty && (
              <button
                type="button"
                onClick={onReset}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95"
                title="Xóa nhận diện để nói lại từ đầu (Phím R)"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Nói lại</span>
                <kbd className="hidden sm:inline-block rounded bg-black/40 px-1 text-[10px] text-amber-200">R</kbd>
              </button>
            )}

            {empty && (
              <span className="ml-auto flex h-4 items-end gap-0.5" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-rose-400/80 transition-all"
                    style={{
                      height: `${Math.max(20, Math.min(100, audioLevel * 1.2 + (i % 2 === 0 ? 10 : 0)))}%`,
                    }}
                  />
                ))}
              </span>
            )}
          </>
        ) : (
          <>
            <MicOff className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-500">Mic off</span>
            {onReset && !empty && (
              <button
                type="button"
                onClick={onReset}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95"
                title="Xóa nhận diện để nói lại từ đầu (Phím R)"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Nói lại</span>
                <kbd className="hidden sm:inline-block rounded bg-black/40 px-1 text-[10px] text-amber-200">R</kbd>
              </button>
            )}
          </>
        )}
      </div>
      <p className={cn('min-h-[2.8rem] sm:min-h-[3.5rem] text-base sm:text-lg leading-relaxed', empty && 'text-slate-500 italic')}>
        {empty ? 'Start speaking in English…' : (
          <>
            <span className="text-white">{finalText}</span>{' '}
            <span className="text-slate-400">{interimText}</span>
          </>
        )}
      </p>
    </div>
  );
}
