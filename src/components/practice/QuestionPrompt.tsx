'use client';

import { useEffect } from 'react';
import { Bot, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

interface Props {
  text: string;
  blurred: boolean;
  partnerQuestion?: string;
}

/** Displays prompt. In standard mode: Vietnamese sentence. In dialogue mode: English partner speech as hero prompt with auto audio, and Vietnamese hint below. */
export function QuestionPrompt({ text, blurred, partnerQuestion }: Props) {
  const { speak, stop, isSpeaking } = useSpeechSynthesis();

  // If in dialogue mode or partnerQuestion exists, the prompt spoken and displayed MUST be English
  const isDialogue = Boolean(partnerQuestion);
  const englishSpeech = partnerQuestion || '';

  // Auto speak partner's question in English when turn starts
  useEffect(() => {
    if (isDialogue && englishSpeech && !blurred) {
      speak(englishSpeech);
    }
  }, [isDialogue, englishSpeech, blurred, speak]);

  if (isDialogue) {
    return (
      <section aria-live="polite" className="w-full text-center space-y-5">
        {/* Main English Partner Question (Hero) */}
        <div
          className={cn(
            'mx-auto max-w-xl rounded-2xl sm:rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/15 to-indigo-500/5 p-4 sm:p-6 text-center shadow-xl backdrop-blur transition-[filter] duration-300',
            blurred && 'select-none blur-md',
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-400 gap-2">
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Partner says:
            </span>
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stop();
                } else {
                  speak(englishSpeech);
                }
              }}
              className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-indigo-500/25 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-indigo-200 hover:bg-indigo-500/40 transition-colors shadow-sm shrink-0"
            >
              <Volume2 className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isSpeaking ? 'animate-bounce text-emerald-300' : ''}`} />
              <span>{isSpeaking ? 'Dừng đọc' : 'Nghe lại'}</span>
            </button>
          </div>
          <h1
            key={englishSpeech}
            className="mt-3 sm:mt-4 animate-[fadeUp_0.35s_ease-out] text-xl font-bold leading-relaxed text-white sm:text-3xl"
          >
            “{englishSpeech}”
          </h1>
        </div>

        {/* Response hint (Vietnamese) */}
        <div
          className={cn(
            'mx-auto max-w-lg rounded-xl sm:rounded-2xl bg-white/[0.03] p-3 sm:p-3.5 ring-1 ring-white/5 transition-[filter] duration-300',
            blurred && 'select-none blur-md',
          )}
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Gợi ý ý bạn cần đáp lại (nói bằng tiếng Anh):
          </p>
          <p className="mt-1 text-sm sm:text-base font-medium text-slate-200">
            👉 {text}
          </p>
        </div>
      </section>
    );
  }

  // Standard Reflex Mode: Vietnamese sentence to translate
  return (
    <section aria-live="polite" className="w-full text-center">
      <p className="mb-2 sm:mb-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dịch sang tiếng Anh</p>
      <h1
        key={text}
        className={cn(
          'animate-[fadeUp_0.35s_ease-out] text-xl font-semibold leading-snug text-white transition-[filter] duration-300 sm:text-3xl',
          blurred && 'select-none blur-md',
        )}
        aria-hidden={blurred}
      >
        {text}
      </h1>
    </section>
  );
}
