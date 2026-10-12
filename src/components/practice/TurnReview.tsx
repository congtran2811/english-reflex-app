'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Lightbulb, Loader2, RotateCcw, Square, Volume2, XCircle } from 'lucide-react';
import type { CompletedTurn } from '@/types/practice';
import type { TurnFeedback } from '@/hooks/useReflexSession';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { VoiceSelector } from '@/components/common/VoiceSelector';
import { DIALOGUE_BANK } from '@/data/dialogueBank';
import { TurnReviewSkeleton } from '@/components/common/LoadingStates';
import { cn } from '@/lib/utils';

interface Props {
  current: number;
  total: number;
  turn: CompletedTurn;
  feedback: TurnFeedback | null;
  onNext: () => void;
  onRetry: () => void;
  onRetryTurn?: () => void;
}

export function TurnReview({ current, total, turn, feedback, onNext, onRetry, onRetryTurn }: Props) {
  const isLast = current >= total;
  const loading = !feedback || feedback.state === 'loading';
  const { speak, stop: stopTTS, isSpeaking } = useSpeechSynthesis();

  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);

  // Stop user recorded audio playback
  const stopUserAudio = useCallback(() => {
    if (userAudioRef.current) {
      try {
        userAudioRef.current.onended = null;
        userAudioRef.current.onerror = null;
        userAudioRef.current.pause();
        userAudioRef.current.currentTime = 0;
        userAudioRef.current.src = '';
      } catch {}
      userAudioRef.current = null;
    }
    setIsPlayingUserAudio(false);
  }, []);

  // Stop all audio (both user voice and TTS)
  const stopAllAudio = useCallback(() => {
    stopUserAudio();
    stopTTS();
  }, [stopUserAudio, stopTTS]);

  // Clean up all playing audio on unmount or when turn changes
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [turn, stopAllAudio]);

  const toggleUserVoice = () => {
    if (!turn.audioUrl) return;

    if (isPlayingUserAudio) {
      stopUserAudio();
      return;
    }

    // Stop TTS if playing
    stopTTS();
    stopUserAudio();

    const audio = new Audio(turn.audioUrl);
    userAudioRef.current = audio;
    setIsPlayingUserAudio(true);

    audio.onended = () => {
      setIsPlayingUserAudio(false);
      userAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsPlayingUserAudio(false);
      userAudioRef.current = null;
    };

    audio.play().catch((err) => {
      console.warn('[TurnReview] Play audio error:', err);
      setIsPlayingUserAudio(false);
      userAudioRef.current = null;
    });
  };

  const handleNext = useCallback(() => {
    stopAllAudio();
    onNext();
  }, [stopAllAudio, onNext]);

  const handleRetryTurn = useCallback(() => {
    stopAllAudio();
    onRetryTurn?.();
  }, [stopAllAudio, onRetryTurn]);

  // Enter → next sentence (once the result is in).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, handleNext]);

  const result = feedback?.state === 'done' ? feedback.result : null;
  const scoreColor = !result ? '' : result.score >= 8 ? 'text-emerald-400' : result.score >= 5 ? 'text-amber-400' : 'text-rose-400';

  return (
    <Card className="mx-auto flex w-full max-w-2xl flex-col gap-6 animate-[fadeUp_0.3s_ease-out]">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Câu {current}/{total}</span>
        <div className="flex items-center gap-3">
          <VoiceSelector />
          {result && (
            <span className={`flex items-center gap-1.5 font-semibold ${result.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
              {result.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {result.isCorrect ? 'Đạt' : 'Cần sửa'}
            </span>
          )}
        </div>
      </div>

      {turn.partnerQuestion && (
        <section className="rounded-xl bg-indigo-500/10 p-4 ring-1 ring-indigo-500/20">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <span>🗣️ Partner said</span>
            <button
              type="button"
              onClick={() => {
                stopUserAudio();
                speak(turn.partnerQuestion!);
              }}
              className="flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-300 hover:bg-indigo-500/30 transition-colors"
            >
              <Volume2 className={`h-3 w-3 ${isSpeaking ? 'animate-bounce' : ''}`} />
              <span>Nghe lại</span>
            </button>
          </div>
          <p className="mt-1.5 text-lg font-semibold text-indigo-100">“{turn.partnerQuestion}”</p>
        </section>
      )}

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {turn.partnerQuestion ? 'Ý phản xạ của bạn' : 'Câu tiếng Việt'}
        </p>
        <p className="mt-1 text-lg font-medium text-white">{turn.vietnamese}</p>
      </section>

      <section className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-500">Bạn đã nói ({turn.timeSpentSeconds}s)</p>
          <div className="flex items-center gap-2">
            {turn.firstSpeechLatency !== null && turn.firstSpeechLatency !== undefined && (
              <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                ⚡ Bắt đầu nói sau: {turn.firstSpeechLatency}s
              </span>
            )}
            {turn.audioUrl && (
              <button
                type="button"
                onClick={toggleUserVoice}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  isPlayingUserAudio
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                )}
                title={isPlayingUserAudio ? 'Bấm để dừng phát' : 'Nghe lại giọng thật bạn vừa nói'}
              >
                {isPlayingUserAudio ? (
                  <>
                    <Square className="h-3 w-3 fill-rose-300 text-rose-300" />
                    <span>Dừng phát</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Nghe giọng của bạn</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-slate-200 italic">“{turn.userTranscript}”</p>
      </section>

      {loading && <TurnReviewSkeleton />}

      {feedback?.state === 'error' && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-rose-300">Không chấm được: {feedback.message}</p>
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" /> Thử lại
          </Button>
        </div>
      )}

      {result && (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${scoreColor}`}>{result.score}</span>
            <span className="text-slate-500">/100</span>
          </div>

          {/* Vinglish / Literal Translation Detector Alert */}
          {result.vinglishAlert && (
            <section className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 animate-[fadeUp_0.3s_ease-out]">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Cảnh báo dịch thô tiếng Việt (Vinglish Alert)
                </p>
                <p className="mt-1 text-sm font-medium text-rose-100/90 leading-relaxed">
                  {result.vinglishAlert}
                </p>
              </div>
            </section>
          )}

          {(() => {
            let nativeDisplay = result.nativeVersion;
            if (turn.partnerQuestion && nativeDisplay) {
              const qClean = turn.partnerQuestion.toLowerCase().replace(/[^a-z0-9]/g, '');
              const nClean = nativeDisplay.toLowerCase().replace(/[^a-z0-9]/g, '');
              const isEchoingQuestion =
                nClean === qClean ||
                (nClean.length > 8 && qClean.includes(nClean)) ||
                (nativeDisplay.endsWith('?') && turn.partnerQuestion.endsWith('?'));

              if (isEchoingQuestion) {
                // 1. Try turn.referenceTranslation if it's different and not a question
                if (turn.referenceTranslation) {
                  const refClean = turn.referenceTranslation.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (refClean !== qClean && !turn.referenceTranslation.endsWith('?')) {
                    nativeDisplay = turn.referenceTranslation;
                  }
                }

                // 2. If still echoing the question, match from DIALOGUE_BANK
                const stillEchoing =
                  nativeDisplay.toLowerCase().replace(/[^a-z0-9]/g, '') === qClean ||
                  nativeDisplay.endsWith('?');

                if (stillEchoing) {
                  const match = Object.values(DIALOGUE_BANK)
                    .flat()
                    .find(
                      (d) =>
                        d.partnerQuestion &&
                        d.partnerQuestion.toLowerCase().replace(/[^a-z0-9]/g, '') === qClean,
                    );
                  if (match?.referenceTranslation) {
                    nativeDisplay = match.referenceTranslation;
                  } else if (qClean.includes('workload') || qClean.includes('managing') || qClean.includes('personallife')) {
                    nativeDisplay =
                      'I prioritize essential tasks each morning and protect my evenings and weekends for family and rest.';
                  } else if (qClean.includes('weekend') || qClean.includes('plan')) {
                    nativeDisplay =
                      "I'm planning to take a break, catch up on reading, and spend quality time with my friends.";
                  } else {
                    nativeDisplay =
                      'I take things one step at a time and focus on what matters most.';
                  }
                }
              }
            }

            return (
              <section className="rounded-xl bg-emerald-500/[0.06] p-4 ring-1 ring-emerald-500/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-emerald-400/80">
                    {turn.partnerQuestion ? 'Câu trả lời mẫu (Bản xứ)' : 'Cách nói tự nhiên (Bản xứ)'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      stopUserAudio();
                      speak(nativeDisplay);
                    }}
                    title="Nghe phát âm chuẩn"
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? 'animate-bounce text-emerald-200' : ''}`} />
                    <span>{isSpeaking ? 'Đang đọc…' : 'Nghe phát âm mẫu'}</span>
                  </button>
                </div>
                <p className="mt-2 text-lg font-medium text-emerald-100">{nativeDisplay}</p>
              </section>
            );
          })()}
          {result.tip && (
            <section className="flex gap-3 rounded-xl bg-amber-500/[0.06] p-4 ring-1 ring-amber-500/20">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-100/90">{result.tip}</p>
            </section>
          )}
        </>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-2">
        {onRetryTurn ? (
          <Button
            type="button"
            variant="secondary"
            onClick={handleRetryTurn}
            className="w-full sm:w-auto border border-white/10 text-slate-300 hover:text-white py-2.5 text-xs sm:text-sm"
          >
            <RotateCcw className="h-4 w-4 text-indigo-400" /> Luyện nói lại câu này
          </Button>
        ) : <div />}
        <Button
          id="btn-next-turn"
          className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm"
          onClick={handleNext}
          disabled={loading}
        >
          {isLast ? 'Xem tổng kết' : 'Câu tiếp theo'} <ArrowRight className="h-4 w-4 ml-1" />
          <kbd className="ml-1 hidden sm:inline-block rounded bg-white/10 px-1.5 text-xs">Enter</kbd>
        </Button>
      </div>
    </Card>
  );
}
