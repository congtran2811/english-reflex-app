'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, MessageSquare, Lightbulb, User, Volume2, Mic, AlertCircle, Square } from 'lucide-react';
import type { EvaluationItemResult } from '@/types/evaluation';
import type { CompletedTurn } from '@/types/practice';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { DIALOGUE_BANK } from '@/data/dialogueBank';

export function SentenceReview({
  result,
  turn,
}: {
  result: EvaluationItemResult;
  turn: CompletedTurn;
}) {
  const isCorrect = result.isCorrect;
  const { speak, stop: stopTTS, isSpeaking } = useSpeechSynthesis();
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);

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

  useEffect(() => {
    return () => {
      stopUserAudio();
      stopTTS();
    };
  }, [stopUserAudio, stopTTS]);

  const toggleUserVoice = () => {
    if (!turn.audioUrl) return;

    if (isPlayingUserAudio) {
      stopUserAudio();
      return;
    }

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
      console.warn('Playback error:', err);
      setIsPlayingUserAudio(false);
      userAudioRef.current = null;
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4 transition-colors',
        isCorrect
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-rose-500/20 bg-rose-500/5'
      )}
    >
      {/* Header: Vietnamese Prompt + Status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {turn.partnerQuestion && (
            <p className="text-xs font-semibold text-indigo-400">
              🗣️ Đối tác: “{turn.partnerQuestion}”
            </p>
          )}
          <p className="font-medium text-slate-200">
            {turn.partnerQuestion ? `Ý bạn đáp: ${turn.vietnamese}` : turn.vietnamese}
          </p>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold',
            isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          )}
        >
          {isCorrect ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {result.score}/100
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* User Transcript */}
        <div className="flex flex-col gap-1.5 rounded-xl bg-black/20 p-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> You ({turn.timeSpentSeconds}s)
            </span>
            <div className="flex items-center gap-2">
              {turn.firstSpeechLatency !== null && turn.firstSpeechLatency !== undefined && (
                <span className="text-[11px] font-normal text-amber-300">
                  ⚡ {turn.firstSpeechLatency}s
                </span>
              )}
              {turn.audioUrl && (
                <button
                  type="button"
                  onClick={toggleUserVoice}
                  title={isPlayingUserAudio ? 'Bấm để dừng phát' : 'Nghe lại giọng nói của bạn'}
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                    isPlayingUserAudio
                      ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                      : 'bg-slate-700/60 text-slate-200 hover:bg-slate-600'
                  )}
                >
                  {isPlayingUserAudio ? (
                    <>
                      <Square className="h-3 w-3 fill-rose-300 text-rose-300" />
                      <span>Dừng</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3 text-emerald-400" />
                      <span>Nghe bạn</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <p
            className={cn(
              'text-sm',
              isCorrect ? 'text-emerald-100' : 'text-rose-100 line-through decoration-rose-500/50'
            )}
          >
            {turn.userTranscript}
          </p>
        </div>

        {/* Native Version / Answer */}
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
              if (turn.referenceTranslation) {
                const refClean = turn.referenceTranslation.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (refClean !== qClean && !turn.referenceTranslation.endsWith('?')) {
                  nativeDisplay = turn.referenceTranslation;
                }
              }

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
            <div className="flex flex-col gap-1.5 rounded-xl bg-indigo-500/10 p-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> {turn.partnerQuestion ? 'Câu đáp mẫu (Native)' : 'Native'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    stopUserAudio();
                    speak(nativeDisplay);
                  }}
                  title="Nghe phát âm chuẩn"
                  className="flex items-center gap-1 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                >
                  <Volume2 className={`h-3 w-3 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  <span>Nghe chuẩn</span>
                </button>
              </div>
              <p className="text-sm font-medium text-indigo-100">{nativeDisplay}</p>
            </div>
          );
        })()}
      </div>

      {/* Vinglish Alert */}
      {result.vinglishAlert && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-bold text-amber-300 uppercase tracking-wide mr-1.5">⚠️ Vinglish Alert:</span>
            <span>{result.vinglishAlert}</span>
          </div>
        </div>
      )}

      {/* AI Tip */}
      {result.tip && (
        <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>{result.tip}</p>
        </div>
      )}
    </div>
  );
}
