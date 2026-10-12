'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import type { CompletedTurn } from '@/types/practice';
import type { BatchEvaluationResponse } from '@/types/evaluation';
import {
  Clock,
  Target,
  Zap,
  ShieldCheck,
  Flame,
  Award,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  computeSessionScore,
  recordSessionCompletion,
  getUserStats,
  type UserStats,
} from '@/lib/scoring';

export function ScoreCard({
  evaluation,
  turns,
}: {
  evaluation: BatchEvaluationResponse;
  turns: CompletedTurn[];
}) {
  const details = computeSessionScore(evaluation, turns);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    // Record session and update user XP/streaks
    const updated = recordSessionCompletion(details);
    setStats(updated);
  }, []);

  const { tierInfo, avgScore, passRate, passedCount, total, avgTimePerTurn, avgLatency, speedRating, vinglishFreePercent, maxStreak, earnedXP, xpBreakdown } = details;

  const tierColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    S: {
      bg: 'from-amber-400/20 via-pink-500/15 to-purple-500/20',
      border: 'border-amber-400/40 ring-amber-400/20',
      text: 'text-amber-300',
      glow: 'shadow-amber-500/20',
    },
    A: {
      bg: 'from-indigo-500/20 via-blue-500/15 to-teal-500/20',
      border: 'border-indigo-400/40 ring-indigo-400/20',
      text: 'text-indigo-300',
      glow: 'shadow-indigo-500/20',
    },
    B: {
      bg: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/20',
      border: 'border-emerald-400/40 ring-emerald-400/20',
      text: 'text-emerald-300',
      glow: 'shadow-emerald-500/20',
    },
    C: {
      bg: 'from-amber-500/20 via-orange-500/15 to-rose-500/20',
      border: 'border-amber-500/30 ring-amber-500/10',
      text: 'text-amber-300',
      glow: 'shadow-amber-500/10',
    },
    D: {
      bg: 'from-rose-500/20 via-pink-500/15 to-slate-500/20',
      border: 'border-rose-500/30 ring-rose-500/10',
      text: 'text-rose-300',
      glow: 'shadow-rose-500/10',
    },
  };

  const style = tierColors[tierInfo.tier] || tierColors.B;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Hero Rank Card */}
      <Card
        className={`relative overflow-hidden border bg-gradient-to-br ${style.bg} ${style.border} p-6 shadow-xl ${style.glow} backdrop-blur-xl`}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: Tier Rank & Title */}
          <div className="flex items-center gap-5">
            <div
              className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border ${style.border} bg-black/40 shadow-inner`}
            >
              <span className="text-3xl font-black tracking-tight text-white drop-shadow">
                {tierInfo.tier}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tier Rank
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
                <Badge tone={passRate >= 70 ? 'success' : 'neutral'}>
                  Level {evaluation.level.replace('_', '–')}
                </Badge>
                <span className="rounded-lg bg-black/30 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  {passedCount}/{total} câu đạt ({passRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Big Score Counter */}
          <div className="flex items-baseline gap-2 rounded-2xl border border-white/10 bg-black/30 px-6 py-4 md:flex-col md:items-end md:gap-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tổng điểm phản xạ
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white sm:text-5xl">
                {avgScore}
              </span>
              <span className="text-lg font-semibold text-slate-500">/100</span>
            </div>
          </div>
        </div>

        {/* Gamification Strip: XP & Streak */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>+{earnedXP} XP</span>
              <span className="text-[11px] font-normal text-slate-400">
                (Base: {xpBreakdown.baseXP}
                {xpBreakdown.speedBonusXP > 0 && ` + Speed: ${xpBreakdown.speedBonusXP}`}
                {xpBreakdown.streakBonusXP > 0 && ` + Streak: ${xpBreakdown.streakBonusXP}`}
                {xpBreakdown.accuracyBonusXP > 0 && ` + Accuracy: ${xpBreakdown.accuracyBonusXP}`})
              </span>
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
              <span>Tổng tích lũy: <strong className="text-white">{stats.totalXP.toLocaleString()} XP</strong></span>
            </div>
          )}
        </div>
      </Card>

      {/* 4 Multi-Dimension Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Avg Reflex Score */}
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            <span>Độ chính xác</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{avgScore}<span className="text-xs text-slate-400">/100</span></p>
          <span className="text-[11px] text-slate-400">Tỷ lệ đạt {passRate}%</span>
        </div>

        {/* Metric 2: Latency */}
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Độ trễ bật nói</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {avgLatency !== null ? `${avgLatency}s` : '—'}
          </p>
          <span className={`text-[11px] ${speedRating?.tone || 'text-slate-400'}`}>
            {speedRating ? speedRating.label : 'Hoàn thành lượt'}
          </span>
        </div>

        {/* Metric 3: Vinglish Free Rate */}
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sạch Vinglish</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{vinglishFreePercent}%</p>
          <span className="text-[11px] text-slate-400">
            {details.vinglishCount === 0 ? 'Không dính lỗi dịch thô' : `Dính ${details.vinglishCount} câu dịch thô`}
          </span>
        </div>

        {/* Metric 4: Max Combo Streak */}
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
            <span>Chuỗi liên tiếp</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">x{maxStreak}</p>
          <span className="text-[11px] text-slate-400">Câu đạt ≥ 80 điểm</span>
        </div>
      </div>
    </div>
  );
}
