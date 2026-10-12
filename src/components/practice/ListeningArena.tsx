'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Volume2,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Flame,
  Gauge,
  Headphones,
  Sliders,
  Send,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useBackgroundNoise } from '@/hooks/useBackgroundNoise';
import { compareTranscripts, type WordComparison } from '@/lib/diff';
import type { ListeningItem, ListeningModeType } from '@/types/listening';
import { LISTENING_LEVELS } from '@/types/listening';
import { ListeningSummary } from '@/components/results/ListeningSummary';
import {
  type ListeningTurnScore,
  computeListeningSessionScore,
} from '@/lib/scoring';
import { ListeningLoadingView } from '@/components/common/LoadingStates';

const MODES = [
  { id: 'echo', label: '🎧 Audio Echo', desc: 'Nghe & lặp lại y hệt' },
  { id: 'keyword', label: '⚡ Bắt từ khóa', desc: 'Nghe & trả lời ý chính' },
  { id: 'speed', label: '⏩ Speed Ramp', desc: 'Tăng tốc độ 0.8x ➔ 1.4x' },
  { id: 'gapfill', label: '🧩 Điền từ khuyết', desc: 'Bắt nối âm & từ nuốt' },
] as const;

const SPEED_LEVELS = [
  { label: '0.8x (Chậm)', rate: '-20%' },
  { label: '1.0x (Chuẩn)', rate: '+0%' },
  { label: '1.25x (Nhanh)', rate: '+25%' },
  { label: '1.4x (Siêu tốc)', rate: '+40%' },
];

export function ListeningArena({ initialLevel = 'B1' }: { initialLevel?: string }) {
  const [items, setItems] = useState<ListeningItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<ListeningModeType>('echo');
  const [level, setLevel] = useState(initialLevel);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Speed Ramp mode step index
  const [speedStep, setSpeedStep] = useState(0);

  // User interaction & review state
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [userSpokenText, setUserSpokenText] = useState('');
  const [comparisonResult, setComparisonResult] = useState<{ accuracy: number; comparisons: WordComparison[] } | null>(null);

  // Keyword mode state
  const [keywordScore, setKeywordScore] = useState<boolean | null>(null);

  // Gap fill mode state
  const [gapInput, setGapInput] = useState('');
  const [gapCorrect, setGapCorrect] = useState<boolean | null>(null);

  // Scoring and session completion state
  const [completedTurns, setCompletedTurns] = useState<ListeningTurnScore[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [turnScore, setTurnScore] = useState<{ score: number; isCorrect: boolean; feedback: string } | null>(null);

  // Hooks
  const tts = useSpeechSynthesis();
  const stt = useSpeechRecognition();
  const noise = useBackgroundNoise();

  const currentItem: ListeningItem | undefined = items[currentIndex];

  // Fetch session items
  const loadSession = useCallback(async (targetLevel: string) => {
    setIsLoadingSession(true);
    setHasPlayed(false);
    setIsRevealed(false);
    setComparisonResult(null);
    setKeywordScore(null);
    setGapCorrect(null);
    setGapInput('');
    setUserSpokenText('');
    setSpeedStep(0);
    setCompletedTurns([]);
    setIsSessionComplete(false);
    setTurnScore(null);

    try {
      const res = await fetch('/api/listening/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: targetLevel }),
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems(data.items);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void loadSession(level);
  }, [level, loadSession]);

  // Auto-play audio when moving to next question or when session item loads
  useEffect(() => {
    if (!currentItem || isLoadingSession || isSessionComplete) return;

    let targetRate = '-4%';
    if (currentMode === 'speed') {
      targetRate = SPEED_LEVELS[speedStep].rate;
    }

    const timer = setTimeout(() => {
      setHasPlayed(true);
      tts.speak(currentItem.englishText, undefined, targetRate);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [currentItem?.id, currentMode, speedStep, isLoadingSession, isSessionComplete]);

  // Play audio for current item (manual click on speaker icon)
  const handlePlayAudio = (rateOverride?: string) => {
    if (!currentItem) return;
    setHasPlayed(true);

    let targetRate = '-4%';
    if (currentMode === 'speed') {
      targetRate = SPEED_LEVELS[speedStep].rate;
    } else if (rateOverride) {
      targetRate = rateOverride;
    }

    tts.speak(currentItem.englishText, undefined, targetRate);
  };

  // Submit voice response for Echo mode
  const handleSubmitEcho = () => {
    if (!currentItem) return;
    const spoken = stt.getTranscript().trim();
    stt.stop();
    setUserSpokenText(spoken);

    const diff = compareTranscripts(currentItem.englishText, spoken);
    setComparisonResult(diff);

    let score = diff.accuracy;
    if (stt.firstSpeechLatency !== null && stt.firstSpeechLatency <= 1.5 && diff.accuracy >= 60) {
      score = Math.min(100, score + 10);
    }
    const isCorrect = score >= 70;
    const feedback =
      diff.accuracy >= 90
        ? 'Xuất sắc! Lặp lại chuẩn xác 100%'
        : diff.accuracy >= 70
          ? 'Tốt! Nghe và bắt âm rõ ràng'
          : 'Cần chú ý nghe lại các từ bị nuốt';

    const turn: ListeningTurnScore = {
      id: currentItem.id,
      mode: 'echo',
      englishText: currentItem.englishText,
      vietnameseMeaning: currentItem.vietnameseMeaning,
      userInput: spoken || '(Chưa ghi nhận giọng nói)',
      score,
      isCorrect,
      feedback,
      soundExplanation: currentItem.soundExplanation,
      latency: stt.firstSpeechLatency,
    };

    setTurnScore({ score, isCorrect, feedback });
    setCompletedTurns((prev) => [...prev.filter((p) => p.id !== turn.id), turn]);
    setIsRevealed(true);
  };

  // Submit voice response for Keyword mode
  const handleSubmitKeyword = () => {
    if (!currentItem) return;
    const spoken = stt.getTranscript().trim().toLowerCase();
    stt.stop();
    setUserSpokenText(spoken);

    const keyPoints = currentItem.keyPoints || [];
    const matched = keyPoints.filter((kp) => spoken.includes(kp.toLowerCase())).length;
    let score = 0;
    if (matched >= 2 || (keyPoints.length === 1 && matched === 1)) {
      score = 100;
    } else if (matched === 1) {
      score = 80;
    } else if (spoken.length > 5) {
      score = 50;
    } else {
      score = 0;
    }
    if (stt.firstSpeechLatency !== null && stt.firstSpeechLatency <= 2.0 && score >= 70) {
      score = Math.min(100, score + 10);
    }
    const isCorrect = score >= 70;
    const feedback = isCorrect ? `Bắt đúng ${matched}/${keyPoints.length} từ khóa chính!` : 'Chưa bắt đúng từ khóa';

    const turn: ListeningTurnScore = {
      id: currentItem.id,
      mode: 'keyword',
      englishText: currentItem.englishText,
      vietnameseMeaning: currentItem.vietnameseMeaning,
      userInput: spoken || '(Chưa trả lời)',
      score,
      isCorrect,
      feedback,
      soundExplanation: currentItem.soundExplanation,
      latency: stt.firstSpeechLatency,
    };

    setKeywordScore(isCorrect);
    setTurnScore({ score, isCorrect, feedback });
    setCompletedTurns((prev) => [...prev.filter((p) => p.id !== turn.id), turn]);
    setIsRevealed(true);
  };

  // Helper to deduce the accurate blank word from maskedSentence and englishText
  const getEffectiveBlankWord = useCallback((item?: ListeningItem): string => {
    if (!item) return '';
    const blankRegex = /\[___\]|___+|\[\.\.\.\]|\(\.\.\.\)/;
    if (item.maskedSentence && blankRegex.test(item.maskedSentence)) {
      const parts = item.maskedSentence.split(blankRegex);
      const prefix = parts[0]?.trim() || '';
      const suffix = parts[1]?.trim() || '';
      const full = item.englishText.trim();
      const pIdx = prefix ? full.toLowerCase().indexOf(prefix.toLowerCase()) : 0;
      const sIdx = suffix ? full.toLowerCase().lastIndexOf(suffix.toLowerCase()) : full.length;
      if (pIdx !== -1 && sIdx !== -1 && sIdx > pIdx + prefix.length) {
        const extracted = full.slice(pIdx + prefix.length, sIdx).trim().replace(/^[.,!?;:]+|[.,!?;:]+$/g, '');
        if (extracted) return extracted;
      }
    }
    return item.blankTargetWord || '';
  }, []);

  // Submit Gap fill check
  const handleCheckGap = (inputWord: string) => {
    if (!currentItem) return;

    const target = getEffectiveBlankWord(currentItem);
    if (!target) return;

    const cleanUser = inputWord.trim().toLowerCase().replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, '');
    const cleanTarget = target.trim().toLowerCase().replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, '');

    const isExact = cleanUser === cleanTarget;
    const targetWords = cleanTarget.split(/\s+/);
    const userWords = cleanUser.split(/\s+/);

    // Check if user input matches the main root word (e.g. "looking" vs "looking for")
    const hasCoreWord =
      targetWords.some((tw) => tw.length >= 3 && cleanUser.includes(tw)) ||
      userWords.some((uw) => uw.length >= 3 && cleanTarget.includes(uw));
    const isSubstring = cleanTarget.includes(cleanUser) || cleanUser.includes(cleanTarget);

    const isRight = isExact || (hasCoreWord && cleanUser.length >= 3);
    const isClose = !isRight && isSubstring && cleanUser.length >= 2;
    const score = isExact ? 100 : isRight ? 90 : isClose ? 60 : 0;
    const isCorrect = score >= 70;
    const feedback = isExact
      ? 'Chính xác 100% từ khuyết!'
      : isRight
        ? 'Rất tốt! Bắt đúng từ khóa chính!'
        : isClose
          ? 'Gần đúng từ khuyết!'
          : 'Chưa đúng từ khuyết';

    const turn: ListeningTurnScore = {
      id: currentItem.id,
      mode: 'gapfill',
      englishText: currentItem.englishText,
      vietnameseMeaning: currentItem.vietnameseMeaning,
      userInput: inputWord || '(Để trống)',
      score,
      isCorrect,
      feedback,
      soundExplanation: currentItem.soundExplanation,
    };

    setGapCorrect(isCorrect);
    setTurnScore({ score, isCorrect, feedback });
    setCompletedTurns((prev) => [...prev.filter((p) => p.id !== turn.id), turn]);
    setIsRevealed(true);
  };

  // Submit Speed Ramp check
  const handleRevealSpeed = () => {
    if (!currentItem) return;
    const speedBonus = speedStep === 3 ? 20 : speedStep === 2 ? 10 : 0;
    const score = Math.min(100, 80 + speedBonus);
    const feedback = `Chinh phục tốc độ ${SPEED_LEVELS[speedStep].label}`;

    const turn: ListeningTurnScore = {
      id: currentItem.id,
      mode: 'speed',
      englishText: currentItem.englishText,
      vietnameseMeaning: currentItem.vietnameseMeaning,
      userInput: `Nghe ở tốc độ ${SPEED_LEVELS[speedStep].label}`,
      score,
      isCorrect: true,
      feedback,
      soundExplanation: currentItem.soundExplanation,
    };

    setTurnScore({ score, isCorrect: true, feedback });
    setCompletedTurns((prev) => [...prev.filter((p) => p.id !== turn.id), turn]);
    setIsRevealed(true);
  };

  // Next Question or Complete Session
  const handleNextQuestion = () => {
    tts.stop();
    stt.stop();
    stt.resetTranscript();
    setHasPlayed(false);
    setIsRevealed(false);
    setComparisonResult(null);
    setKeywordScore(null);
    setGapCorrect(null);
    setGapInput('');
    setUserSpokenText('');
    setTurnScore(null);

    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSessionComplete(true);
    }
  };

  if (isSessionComplete && completedTurns.length > 0) {
    return (
      <ListeningSummary
        summary={computeListeningSessionScore(completedTurns)}
        level={level}
        onRetry={() => void loadSession(level)}
        onChangeLevel={(newLevel) => setLevel(newLevel)}
      />
    );
  }

  if (isLoadingSession) {
    return <ListeningLoadingView />;
  }

  if (!currentItem) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 animate-[fadeUp_0.4s_ease-out]">
      {/* Top Header / Mode Switcher */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center justify-between">
          <Link
            href="/practice"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Về chọn cấp độ
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
              🎧 Listening Reflex Arena
            </span>
          </div>
        </div>

        {/* CEFR Level Selector */}
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Chọn Cấp Độ Luyện Nghe (CEFR Level):
            </span>
            <span className="text-[11px] text-indigo-300 font-semibold">
              {LISTENING_LEVELS.find((l) => l.id === level)?.title}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LISTENING_LEVELS.map((lvl) => {
              const isSelected = level === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    if (level !== lvl.id) {
                      setLevel(lvl.id);
                    }
                  }}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/30 text-white shadow-md ring-2 ring-indigo-400'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-extrabold text-white">{lvl.label}</span>
                    <span className="text-[10px] text-slate-400">{lvl.wordCount}</span>
                  </div>
                  <span className="text-[11px] line-clamp-1 text-slate-300 font-medium">
                    {lvl.title.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 border-t border-white/5 pt-2 mt-0.5">
            🎯 <b className="text-slate-300">Đặc trưng bóc tách âm:</b> {LISTENING_LEVELS.find((l) => l.id === level)?.focus}
          </p>
        </div>

        {/* 4 Listening Modes Switcher */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES.map((m) => {
            const active = currentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setCurrentMode(m.id as ListeningModeType);
                  setIsRevealed(false);
                  setComparisonResult(null);
                }}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
                  active
                    ? 'border-indigo-500/50 bg-indigo-600/20 shadow-md ring-2 ring-indigo-400'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="text-xs font-bold text-white">{m.label}</span>
                <span className="text-[10px] text-slate-400 line-clamp-1">{m.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Background Ambient Noise Selector (Chức năng 3) */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 p-2.5 px-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-semibold">Môi trường nghe thực tế:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {noise.options.map((opt) => {
              const active = noise.currentNoise === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => noise.startNoise(opt.id)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                  title={opt.description}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Listening Card */}
      <Card className="flex flex-col items-center gap-4 sm:gap-6 p-4 sm:p-8 text-center">
        {/* Progress header */}
        <div className="flex w-full items-center justify-between text-xs text-slate-400">
          <span>
            Câu <b className="text-white">{currentIndex + 1}</b> / {items.length}
          </span>
          <span className="font-semibold text-indigo-300">Level {level}</span>
        </div>

        {/* Audio Player Action Center */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 py-1 sm:py-2">
          <button
            type="button"
            onClick={() => {
              if (tts.isSpeaking) {
                tts.stop();
              } else {
                handlePlayAudio();
              }
            }}
            className={`group relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-fuchsia-600 shadow-2xl transition-all hover:scale-105 active:scale-95 ${
              tts.isSpeaking ? 'ring-4 ring-indigo-400 ring-offset-4 ring-offset-slate-900 animate-pulse' : ''
            }`}
            title={tts.isSpeaking ? 'Bấm để dừng âm thanh' : 'Bấm để nghe âm thanh'}
          >
            <Volume2 className={`h-8 w-8 sm:h-10 sm:w-10 text-white ${tts.isSpeaking ? 'animate-bounce' : ''}`} />
          </button>
          <p className="text-xs font-semibold text-indigo-300">
            {tts.isSpeaking ? 'Đang phát âm thanh... (Bấm để dừng)' : hasPlayed ? 'Bấm để nghe lại' : 'Bấm vào loa để bắt đầu nghe'}
          </p>

          {/* Speed Ramp controls if mode === speed */}
          {currentMode === 'speed' && (
            <div className="mt-2 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5">
              <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-amber-400" /> Tốc độ:
              </span>
              {SPEED_LEVELS.map((sl, idx) => (
                <button
                  key={sl.label}
                  type="button"
                  onClick={() => {
                    setSpeedStep(idx);
                    handlePlayAudio(sl.rate);
                  }}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                    speedStep === idx
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {sl.label.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MODE 1: Audio Echo (Repeat After Me) */}
        {currentMode === 'echo' && (
          <div className="w-full space-y-4">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                Nói lặp lại toàn bộ câu bạn vừa nghe được:
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-200 italic">
                    {stt.isListening ? stt.transcript || 'Đang nghe bạn nói...' : userSpokenText || 'Chưa ghi nhận giọng nói'}
                  </p>
                  {stt.isListening && (
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10" title={`Âm lượng: ${stt.audioLevel}%`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-75"
                        style={{ width: `${Math.min(100, Math.max(stt.audioLevel * 1.5, stt.audioLevel > 0 ? 10 : 0))}%` }}
                      />
                    </div>
                  )}
                </div>
                {stt.firstSpeechLatency !== null && (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                    ⚡ {stt.firstSpeechLatency}s
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant={stt.isListening ? 'danger' : 'primary'}
                onClick={() => {
                  if (stt.isListening) {
                    handleSubmitEcho();
                  } else {
                    stt.resetTranscript();
                    stt.start();
                  }
                }}
                className="flex-1 h-12 text-sm font-semibold"
              >
                {stt.isListening ? <Send className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {stt.isListening ? 'Nói xong & Chấm điểm diff' : 'Bật Mic để nói lặp lại'}
              </Button>

              {(stt.transcript || userSpokenText || stt.isListening) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    stt.resetTranscript();
                    setUserSpokenText('');
                    if (!stt.isListening) {
                      stt.start();
                    }
                  }}
                  className="h-12 px-4 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                  title="Xóa nhận diện để nói lại từ đầu"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Nói lại
                </Button>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: Catch the Keyword & Gist */}
        {currentMode === 'keyword' && (
          <div className="w-full space-y-4 text-left">
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                ❓ Câu hỏi phản xạ từ nội dung nghe:
              </p>
              <p className="text-base font-bold text-white">
                “{currentItem.question || 'What is the main topic of the sentence?'}”
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                Nói câu trả lời hoặc các từ khóa chính:
              </p>
              <p className="text-sm font-medium text-slate-200 italic">
                {stt.isListening ? stt.transcript || 'Đang nghe câu trả lời...' : userSpokenText || 'Bấm nút dưới để trả lời'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant={stt.isListening ? 'danger' : 'primary'}
                onClick={() => {
                  if (stt.isListening) {
                    handleSubmitKeyword();
                  } else {
                    stt.resetTranscript();
                    stt.start();
                  }
                }}
                className="flex-1 h-12 text-sm font-semibold"
              >
                {stt.isListening ? <Send className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {stt.isListening ? 'Nói xong & Kiểm tra từ khóa' : 'Nói câu trả lời bằng tiếng Anh'}
              </Button>

              {(stt.transcript || userSpokenText || stt.isListening) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    stt.resetTranscript();
                    setUserSpokenText('');
                    if (!stt.isListening) {
                      stt.start();
                    }
                  }}
                  className="h-12 px-4 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                  title="Xóa nhận diện để nói lại từ đầu"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Nói lại
                </Button>
              )}
            </div>
          </div>
        )}

        {/* MODE 4: Speed Ramp (0.8x -> 1.4x) */}
        {currentMode === 'speed' && (
          <div className="w-full space-y-3 text-center">
            <p className="text-xs text-slate-400">
              Hãy thử nghe ở từng nấc tốc độ tăng dần. Não bộ sẽ thích nghi giải mã âm thanh siêu tốc!
            </p>
            {!isRevealed ? (
              <Button onClick={handleRevealSpeed} variant="secondary" className="w-full">
                Hiện phụ đề câu tiếng Anh & Chốt điểm
              </Button>
            ) : null}
          </div>
        )}

        {/* MODE 5: Selective Gap Fill (Linking / Weak forms) */}
        {currentMode === 'gapfill' && (
          <div className="w-full space-y-4 text-left">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Nghe và điền từ khuyết vào chỗ trống:
              </p>
              <p className="text-lg font-bold text-white tracking-wide">
                {currentItem.maskedSentence || currentItem.englishText}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={gapInput}
                onChange={(e) => setGapInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && gapInput.trim()) handleCheckGap(gapInput);
                }}
                placeholder="Nhập từ bạn nghe được ở chỗ khuyết..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <Button onClick={() => handleCheckGap(gapInput)} disabled={!gapInput.trim()}>
                Kiểm tra
              </Button>
            </div>
          </div>
        )}

        {/* Reveal & Review Results Section */}
        {isRevealed && (
          <div className="w-full space-y-4 pt-4 border-t border-white/10 text-left animate-[fadeIn_0.3s_ease]">
            {/* Real-time Turn Score Banner */}
            {turnScore && (
              <div className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-indigo-300">
                    +{turnScore.score}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    điểm ({turnScore.feedback})
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    turnScore.isCorrect
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                  }`}
                >
                  {turnScore.isCorrect ? '✓ Đạt chuẩn' : '⚡ Cần rèn thêm'}
                </span>
              </div>
            )}

            {/* Diff Result for Echo Mode */}
            {currentMode === 'echo' && comparisonResult && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Đối chiếu từng từ (Word Diff):
                  </span>
                  <span className={`text-sm font-extrabold ${comparisonResult.accuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Độ chính xác: {comparisonResult.accuracy}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-base font-semibold">
                  {comparisonResult.comparisons.map((c, i) => (
                    <span
                      key={i}
                      className={`rounded px-1.5 py-0.5 ${
                        c.matched
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300 line-through decoration-rose-500'
                      }`}
                    >
                      {c.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword result */}
            {currentMode === 'keyword' && keywordScore !== null && (
              <div className={`flex items-start gap-3 rounded-2xl border p-4 ${keywordScore ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                {keywordScore ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" /> : <XCircle className="h-5 w-5 text-rose-400 mt-0.5" />}
                <div>
                  <p className="text-sm font-bold text-white">
                    {keywordScore ? 'Chính xác! Bạn đã bắt đúng từ khóa chính.' : 'Chưa đúng trọng tâm.'}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Từ khóa cốt lõi cần bắt: <b className="text-indigo-300">{(currentItem.keyPoints || []).join(', ')}</b>
                  </p>
                </div>
              </div>
            )}

            {/* Gap Fill Result */}
            {currentMode === 'gapfill' && gapCorrect !== null && (
              <div className={`flex items-start gap-3 rounded-2xl border p-4 ${gapCorrect ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                {gapCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" /> : <XCircle className="h-5 w-5 text-rose-400 mt-0.5" />}
                <div>
                  <p className="text-sm font-bold text-white">
                    {gapCorrect ? 'Chính xác!' : 'Đáp án đúng là:'} <span className="text-indigo-300 font-extrabold">{getEffectiveBlankWord(currentItem)}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Full English sentence & meaning */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-1">
                Câu tiếng Anh gốc:
              </p>
              <p className="text-base font-bold text-indigo-100">
                “{currentItem.englishText}”
              </p>
              <p className="text-sm text-slate-300 mt-1">
                👉 {currentItem.vietnameseMeaning}
              </p>
            </div>

            {/* Sound explanation (Linking & Weak forms) */}
            {currentItem.soundExplanation && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 mr-1.5">Mẹo âm thanh & Nối âm:</span>
                  <span>{currentItem.soundExplanation}</span>
                </div>
              </div>
            )}

            {/* Next sentence button */}
            <Button onClick={handleNextQuestion} className="w-full h-12 text-sm font-bold mt-2">
              <span>{currentIndex < items.length - 1 ? 'Sang câu tiếp theo' : 'Xem bảng điểm tổng kết 🏆'}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
