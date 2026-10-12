'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ArrowLeft, BookOpen, Clock, Loader2, MicOff, Play, Sparkles } from 'lucide-react';
import type { DifficultyLevel, PracticePrompt } from '@/types/practice';
import { TURN_DURATION_OPTIONS } from '@/lib/constants';
import { TOPIC_SUGGESTIONS } from '@/lib/topics';
import { useReflexSession } from '@/hooks/useReflexSession';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ArenaHeader } from './ArenaHeader';
import { CountdownTimer } from './CountdownTimer';
import { QuestionPrompt } from './QuestionPrompt';
import { LiveTranscript } from './LiveTranscript';
import { ControlBar } from './ControlBar';
import { ResultSummary } from '../results/ResultSummary';
import { TurnReview } from './TurnReview';
import { MistakesModal } from '@/components/mistakes/MistakesModal';
import { VoiceSelector } from '@/components/common/VoiceSelector';
import { EvaluationLoadingView, GeneratingPromptsLoadingView } from '@/components/common/LoadingStates';

export function PracticeArena({ level }: { level: DifficultyLevel }) {
  const s = useReflexSession(level);
  const [showMistakes, setShowMistakes] = useState(false);
  const active = s.status === 'practicing' || s.status === 'paused';
  const paused = s.status === 'paused';

  const handleResetSpeech = () => {
    s.speech.resetTranscript();
    if (!s.speech.isListening && !paused) {
      s.speech.start();
    }
  };

  useKeyboardShortcuts(
    { onTogglePause: s.togglePause, onSubmit: s.submitTurn, onReset: handleResetSpeech },
    active,
  );

  if (s.speech.support === 'unsupported') {
    return (
      <Notice icon={<AlertTriangle className="h-8 w-8 text-amber-400" />} title="Trình duyệt không hỗ trợ nhận diện giọng nói">
        Vui lòng mở ứng dụng bằng <b>Google Chrome</b> hoặc <b>Microsoft Edge</b> trên máy tính.
      </Notice>
    );
  }

  if (s.speech.error?.code === 'permission-denied' || s.speech.error?.code === 'no-microphone') {
    return (
      <Notice icon={<MicOff className="h-8 w-8 text-rose-400" />} title="Không truy cập được microphone">
        {s.speech.error.message}
        <p className="mt-2 text-sm text-slate-400">Nhấn biểu tượng 🔒 trên thanh địa chỉ → Site settings → Microphone → Allow, rồi tải lại trang.</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>Tải lại trang</Button>
      </Notice>
    );
  }

  if (s.isPreparing) {
    return <GeneratingPromptsLoadingView topic={s.topicText} level={level} />;
  }

  if (s.status === 'ready') {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        <div className="mb-4 w-full flex items-center justify-between">
          <Link
            href="/practice"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Đổi cấp độ
          </Link>
          <button
            type="button"
            onClick={() => setShowMistakes(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-white/10 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" /> Sổ tay câu sai
          </button>
        </div>

        <Card className="w-full text-center">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
              <Sparkles className="h-3.5 w-3.5" /> AI Reflex Training
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-bold text-slate-400 ring-1 ring-white/10">
              Level {level.replace('_', '–')}
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-white">Sẵn sàng luyện phản xạ?</h1>
          <p className="mt-2 text-slate-300 text-sm">
            10 câu · <span className="font-semibold text-indigo-300">{s.turnDuration} giây</span> mỗi câu · nói bản dịch tiếng Anh thật nhanh.
          </p>

          {/* Mode Selector: Standard Reflex vs Dialogue Ping-Pong */}
          <div className="mt-6 flex flex-col items-start text-left gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hình thức luyện tập
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => s.setIsDialogueMode(false)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3.5 transition-all text-left ${
                  !s.isDialogueMode
                    ? 'border-indigo-500/50 bg-indigo-600/20 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-400'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  ⚡ Dịch phản xạ câu
                </span>
                <span className="text-[11px] text-slate-400">
                  Hiện câu tiếng Việt, bạn lập tức dịch và nói tiếng Anh
                </span>
              </button>

              <button
                type="button"
                onClick={() => s.setIsDialogueMode(true)}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3.5 transition-all text-left ${
                  s.isDialogueMode
                    ? 'border-indigo-500/50 bg-indigo-600/20 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-400'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                  🗣️ Đối thoại Ping-Pong
                </span>
                <span className="text-[11px] text-slate-400">
                  AI đặt câu hỏi tiếng Anh, bạn phản xạ đáp lại theo gợi ý
                </span>
              </button>
            </div>
          </div>

          {/* Custom Topic Input & Quick Suggestions */}
          <div className="mt-5 flex flex-col items-start text-left gap-2 w-full">
            <div className="flex items-center justify-between w-full">
              <label htmlFor="topic-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Chủ đề muốn luyện (Tự do nhập hoặc chọn gợi ý)
              </label>
              {s.topicText && (
                <button
                  type="button"
                  onClick={() => s.setTopicText('')}
                  className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  Xóa / Để ngẫu nhiên
                </button>
              )}
            </div>

            {/* Input field */}
            <div className="relative w-full">
              <input
                id="topic-input"
                type="text"
                value={s.topicText}
                onChange={(e) => s.setTopicText(e.target.value)}
                placeholder="Ví dụ: Đi phỏng vấn xin việc, Đặt đồ ăn ở nhà hàng, Mua xe..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition-all focus:border-indigo-400 focus:bg-white/[0.08] focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500">Gợi ý nhanh:</span>
              {TOPIC_SUGGESTIONS.map((sug) => {
                const isSelected =
                  (!s.topicText && sug.label === 'Ngẫu nhiên') ||
                  s.topicText.trim().toLowerCase() === sug.label.toLowerCase();
                return (
                  <button
                    key={sug.label}
                    type="button"
                    onClick={() => s.setTopicText(sug.label === 'Ngẫu nhiên' ? '' : sug.label)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600/40 text-indigo-200 ring-1 ring-indigo-400 font-medium'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <span>{sug.icon}</span>
                    <span>{sug.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Neural Voice Selector */}
          <div className="mt-5 flex items-center justify-between w-full rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Giọng đọc AI (Neural TTS)
              </label>
              <p className="text-[11px] text-slate-400">Đọc câu đối thoại & phát âm mẫu tự nhiên</p>
            </div>
            <VoiceSelector />
          </div>

          {/* Time selection chips */}
          <div className="mt-5 flex flex-col items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Clock className="h-3.5 w-3.5 text-indigo-400" /> Thời gian mỗi câu
            </label>
            <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Thời gian đếm ngược">
              {TURN_DURATION_OPTIONS.map((sec) => {
                const selected = s.turnDuration === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => s.setTurnDuration(sec)}
                    className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white ring-1 ring-white/10'
                    }`}
                  >
                    {sec}s
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="mt-5 space-y-1 text-xs text-slate-400">
            <li><kbd className="rounded bg-white/10 px-1.5">Space</kbd> / <kbd className="rounded bg-white/10 px-1.5">Esc</kbd> tạm dừng · <kbd className="rounded bg-white/10 px-1.5">Enter</kbd> sang câu tiếp</li>
          </ul>
          <Button
            id="btn-start-session"
            className="mt-6 w-full py-3 text-base"
            onClick={s.begin}
            disabled={s.isPreparing || s.speech.support !== 'supported'}
          >
            {s.isPreparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            {s.isPreparing ? 'Đang tạo đề bằng Ollama...' : 'Bắt đầu ngay'}
          </Button>
        </Card>

        <MistakesModal
          isOpen={showMistakes}
          onClose={() => setShowMistakes(false)}
          onPracticeMistakes={(customPrompts: PracticePrompt[]) => {
            s.startCustomPrompts(customPrompts);
          }}
        />
      </div>
    );
  }

  if (s.status === 'reviewing' && s.currentTurn) {
    return (
      <TurnReview
        current={s.index + 1}
        total={s.total}
        turn={s.currentTurn}
        feedback={s.currentFeedback}
        onNext={s.nextTurn}
        onRetry={s.retryTurnEvaluation}
        onRetryTurn={s.retryCurrentTurn}
      />
    );
  }

  if (s.status === 'evaluating') {
    return <EvaluationLoadingView />;
  }

  if (s.status === 'error') {
    return (
      <Notice icon={<AlertTriangle className="h-8 w-8 text-rose-400" />} title="Chấm điểm thất bại">
        {s.evalError}
        <div className="mt-4 flex justify-center gap-3">
          <Button onClick={s.retryEvaluation}>Thử lại</Button>
          <Button variant="secondary" onClick={s.begin}>Làm lượt mới</Button>
        </div>
      </Notice>
    );
  }

  if (s.status === 'completed' && s.evaluation) {
    return <ResultSummary evaluation={s.evaluation} turns={s.turns} onRetry={s.begin} />;
  }

  return (
    <>
      <Card className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 sm:gap-8">
        <ArenaHeader current={s.index + 1} total={s.total} level={level} />
        <CountdownTimer timeLeft={s.timeLeft} total={s.turnDuration} paused={paused} />
        <QuestionPrompt
          text={s.currentPrompt?.vietnamese ?? ''}
          partnerQuestion={s.currentPrompt?.partnerQuestion}
          blurred={false}
        />
        <LiveTranscript
          finalText={s.speech.finalTranscript}
          interimText={s.speech.interimTranscript}
          listening={s.speech.isListening && !paused}
          audioLevel={s.speech.audioLevel}
          onReset={handleResetSpeech}
        />
        <ControlBar
          paused={paused}
          hasText={Boolean(s.speech.finalTranscript || s.speech.interimTranscript)}
          onTogglePause={s.togglePause}
          onSubmit={s.submitTurn}
          onReset={handleResetSpeech}
        />
        {s.speech.error && <p className="text-sm text-amber-300">{s.speech.error.message}</p>}
      </Card>
    </>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="mx-auto w-full max-w-lg text-center">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="mt-2 text-slate-300">{children}</div>
    </Card>
  );
}
