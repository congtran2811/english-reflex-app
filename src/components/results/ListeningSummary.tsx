'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button, buttonVariants } from '@/components/common/Button';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  LayoutGrid,
  Zap,
  Target,
  Sparkles,
  Flame,
  Award,
  Lightbulb,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import {
  type ListeningSessionSummary,
  recordListeningSessionCompletion,
  getUserStats,
  type UserStats,
} from '@/lib/scoring';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

export function ListeningSummary({
  summary,
  level,
  onRetry,
  onChangeLevel,
}: {
  summary: ListeningSessionSummary;
  level: string;
  onRetry: () => void;
  onChangeLevel?: (newLevel: string) => void;
}) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const { speak, isSpeaking } = useSpeechSynthesis();

  useEffect(() => {
    const updated = recordListeningSessionCompletion(summary);
    setStats(updated);
  }, []);

  const { tierInfo, avgScore, passRate, passedCount, total, avgLatency, speedRating, earnedXP, turns } = summary;

  const tierColors: Record<string, { bg: string; border: string; glow: string }> = {
    S: {
      bg: 'from-amber-400/20 via-pink-500/15 to-purple-500/20',
      border: 'border-amber-400/40 ring-amber-400/20',
      glow: 'shadow-amber-500/20',
    },
    A: {
      bg: 'from-indigo-500/20 via-blue-500/15 to-teal-500/20',
      border: 'border-indigo-400/40 ring-indigo-400/20',
      glow: 'shadow-indigo-500/20',
    },
    B: {
      bg: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/20',
      border: 'border-emerald-400/40 ring-emerald-400/20',
      glow: 'shadow-emerald-500/20',
    },
    C: {
      bg: 'from-amber-500/20 via-orange-500/15 to-rose-500/20',
      border: 'border-amber-500/30 ring-amber-500/10',
      glow: 'shadow-amber-500/10',
    },
    D: {
      bg: 'from-rose-500/20 via-pink-500/15 to-slate-500/20',
      border: 'border-rose-500/30 ring-rose-500/10',
      glow: 'shadow-rose-500/10',
    },
  };

  const style = tierColors[tierInfo.tier] || tierColors.B;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12 animate-[fadeUp_0.35s_ease-out]">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          Hoàn thành bài luyện nghe! 🎧
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Dưới đây là điểm số giải mã âm thanh và độ nhạy tai nghe của bạn.
        </p>
      </div>

      {/* Hero Rank Card */}
      <Card
        className={`relative overflow-hidden border bg-gradient-to-br ${style.bg} ${style.border} p-6 shadow-xl ${style.glow} backdrop-blur-xl`}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border ${style.border} bg-black/40 shadow-inner`}
            >
              <span className="text-3xl font-black tracking-tight text-white drop-shadow">
                {tierInfo.tier}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Listening Rank
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{tierInfo.icon}</span>
                <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                  {tierInfo.label}
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                {tierInfo.description}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Badge tone={passRate >= 70 ? 'success' : 'neutral'}>Level {level}</Badge>
                <span className="rounded-lg bg-black/30 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  {passedCount}/{total} câu đạt ({passRate}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-2 rounded-2xl border border-white/10 bg-black/30 px-6 py-4 md:flex-col md:items-end md:gap-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Điểm kỹ năng nghe
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white sm:text-5xl">
                {avgScore}
              </span>
              <span className="text-lg font-semibold text-slate-500">/100</span>
            </div>
          </div>
        </div>

        {/* Gamification Strip */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>+{earnedXP} XP Luyện nghe</span>
            </div>
            {stats && (
              <div className="flex items-center gap-1.5 font-semibold text-orange-400">
                <Flame className="h-4 w-4" />
                <span>Chuỗi {stats.dailyStreak} ngày học</span>
              </div>
            )}
          </div>

          {stats && (
            <div className="flex items-center gap-2 text-slate-400">
              <Award className="h-3.5 w-3.5 text-indigo-400" />
              <span>Tổng: <strong className="text-white">{stats.totalXP.toLocaleString()} XP</strong></span>
            </div>
          )}
        </div>
      </Card>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            <span>Độ chính xác</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{avgScore}<span className="text-xs text-slate-400">/100</span></p>
          <span className="text-[11px] text-slate-400">Tỷ lệ đạt {passRate}%</span>
        </div>

        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Độ trễ bắt âm</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {avgLatency !== null ? `${avgLatency}s` : '—'}
          </p>
          <span className={`text-[11px] ${speedRating?.tone || 'text-slate-400'}`}>
            {speedRating ? speedRating.label : 'Phản xạ ổn định'}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Headphones className="h-3.5 w-3.5 text-emerald-400" />
            <span>Số câu hoàn thành</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{passedCount}/{total}</p>
          <span className="text-[11px] text-slate-400">Đã giải mã thành công</span>
        </div>
      </div>

      {/* Review List of Listening Items */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Chi tiết từng câu bài nghe
        </h3>
        {turns.map((turn, index) => (
          <div
            key={turn.id || index}
            className={`flex flex-col gap-2.5 rounded-2xl border p-4 transition-all ${
              turn.isCorrect
                ? 'border-emerald-500/20 bg-emerald-950/10'
                : 'border-rose-500/20 bg-rose-950/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  {turn.mode === 'echo' ? 'Audio Echo' : turn.mode === 'keyword' ? 'Bắt từ khóa' : turn.mode === 'gapfill' ? 'Điền từ khuyết' : 'Speed Ramp'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                    turn.isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {turn.isCorrect ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {turn.score}/100
                </span>
              </div>
            </div>

            {/* Audio Sentence & Meaning */}
            <div className="flex items-center justify-between rounded-xl bg-black/20 p-3">
              <div>
                <p className="text-base font-bold text-white">“{turn.englishText}”</p>
                <p className="text-xs text-slate-300 mt-0.5">👉 {turn.vietnameseMeaning}</p>
              </div>
              <button
                type="button"
                onClick={() => speak(turn.englishText)}
                className="shrink-0 rounded-xl bg-indigo-500/20 p-2 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                title="Nghe lại"
              >
                <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
              </button>
            </div>

            {/* User Input Review */}
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span>Bạn đã trả lời: <b className="text-white italic">“{turn.userInput || '(Chưa có câu trả lời)'}”</b></span>
              <span className={turn.isCorrect ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                {turn.feedback}
              </span>
            </div>

            {/* Sound explanation */}
            {turn.soundExplanation && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-2.5 text-xs text-amber-200">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{turn.soundExplanation}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Level Selection Pills */}
      {onChangeLevel && (
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10">
          <span className="text-xs font-semibold text-slate-400">Chuyển nhanh sang cấp độ khác:</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'A1_A2', label: 'A1–A2 (Cơ bản)' },
              { id: 'B1', label: 'B1 (Trung cấp)' },
              { id: 'B2', label: 'B2 (Khá)' },
              { id: 'C1', label: 'C1 (Nâng cao)' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onChangeLevel(lvl.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  level === lvl.id
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <Button onClick={onRetry} className="px-8 py-3 font-bold">
          <RefreshCcw className="h-4 w-4 mr-2" /> Luyện tập tiếp ({level})
        </Button>
        <Link href="/practice" className={buttonVariants('secondary', 'px-8 py-3')}>
          <LayoutGrid className="h-4 w-4 mr-2" /> Chọn dạng bài khác
        </Link>
        <Link href="/" className={buttonVariants('ghost', 'px-6 py-3 text-slate-400 hover:text-white')}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
