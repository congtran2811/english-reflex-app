'use client';

import type { BatchEvaluationResponse, EvaluationItemResult } from '@/types/evaluation';
import type { CompletedTurn } from '@/types/practice';

export type ReflexRankTier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface TierInfo {
  tier: ReflexRankTier;
  label: string;
  badgeTone: 'emerald' | 'indigo' | 'amber' | 'rose';
  icon: string;
  description: string;
}

export interface SessionScoreDetails {
  total: number;
  passedCount: number;
  passRate: number; // 0 - 100%
  avgScore: number; // 0 - 100
  tierInfo: TierInfo;
  avgTimePerTurn: number; // seconds
  avgLatency: number | null; // seconds
  speedRating: {
    label: string;
    tone: string;
  } | null;
  vinglishCount: number;
  vinglishFreePercent: number; // 0 - 100%
  maxStreak: number; // Consecutive high-score answers (>= 80)
  earnedXP: number;
  xpBreakdown: {
    baseXP: number;
    speedBonusXP: number;
    streakBonusXP: number;
    accuracyBonusXP: number;
  };
}

export interface UserStats {
  totalXP: number;
  totalSessions: number;
  dailyStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  bestTier: ReflexRankTier;
}

const STATS_STORAGE_KEY = 'reflex.userStats.v1';

export function getTierInfo(score: number): TierInfo {
  if (score >= 90) {
    return {
      tier: 'S',
      label: 'Bản xứ xuất sắc',
      badgeTone: 'emerald',
      icon: '💎',
      description: 'Phản xạ tức thì, diễn đạt tự nhiên như người bản xứ!',
    };
  }
  if (score >= 80) {
    return {
      tier: 'A',
      label: 'Thành thạo trôi chảy',
      badgeTone: 'indigo',
      icon: '🥇',
      description: 'Hiểu nhanh, diễn đạt đúng cấu trúc và phong phú!',
    };
  }
  if (score >= 70) {
    return {
      tier: 'B',
      label: 'Đạt yêu cầu',
      badgeTone: 'amber',
      icon: '🥈',
      description: 'Truyền tải đủ ý, ngữ pháp tương đối chuẩn xác.',
    };
  }
  if (score >= 50) {
    return {
      tier: 'C',
      label: 'Cần cải thiện',
      badgeTone: 'amber',
      icon: '🥉',
      description: 'Còn vấp váp hoặc dính lỗi dịch thô (Vinglish). Cần luyện thêm!',
    };
  }
  return {
    tier: 'D',
    label: 'Khởi đầu mới',
    badgeTone: 'rose',
    icon: '⚡',
    description: 'Chưa đạt mức yêu cầu. Hãy thử ôn lại câu sai trong Sổ tay nhé!',
  };
}

export function computeSessionScore(
  evaluation: BatchEvaluationResponse,
  turns: CompletedTurn[],
): SessionScoreDetails {
  const total = evaluation.results.length || 1;
  const passedCount = evaluation.results.filter((r) => r.isCorrect).length;
  const passRate = Math.round((passedCount / total) * 100);

  const avgScore = Math.round(
    evaluation.results.reduce((acc, r) => acc + (r.score || 0), 0) / total,
  );

  const tierInfo = getTierInfo(avgScore);

  const avgTimePerTurn = Number(
    (turns.reduce((acc, t) => acc + (t.timeSpentSeconds || 0), 0) / (turns.length || 1)).toFixed(1),
  );

  const validLatencies = turns
    .map((t) => t.firstSpeechLatency)
    .filter((l): l is number => typeof l === 'number' && !isNaN(l) && l >= 0);

  const avgLatency = validLatencies.length
    ? Number((validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length).toFixed(1))
    : null;

  let speedRating: { label: string; tone: string } | null = null;
  if (avgLatency !== null) {
    if (avgLatency <= 1.2) {
      speedRating = { label: 'Tia chớp (Tức thì)', tone: 'text-amber-400 font-bold' };
    } else if (avgLatency <= 2.2) {
      speedRating = { label: 'Rất nhanh', tone: 'text-emerald-400 font-semibold' };
    } else if (avgLatency <= 3.5) {
      speedRating = { label: 'Khá ổn', tone: 'text-indigo-300' };
    } else {
      speedRating = { label: 'Cần tăng tốc', tone: 'text-slate-400' };
    }
  }

  // Vinglish analytics
  const vinglishCount = evaluation.results.filter((r) => Boolean(r.vinglishAlert)).length;
  const vinglishFreePercent = Math.max(0, Math.round(((total - vinglishCount) / total) * 100));

  // Max streak of >= 80 score
  let currentStreak = 0;
  let maxStreak = 0;
  for (const r of evaluation.results) {
    if (r.score >= 80) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // XP calculation
  const baseXP = avgScore * total;
  const speedBonusXP = avgLatency !== null && avgLatency <= 1.5 ? 100 : 0;
  const streakBonusXP = maxStreak >= 5 ? 150 : maxStreak >= 3 ? 50 : 0;
  const accuracyBonusXP = passRate >= 90 ? 150 : passRate >= 70 ? 50 : 0;
  const earnedXP = baseXP + speedBonusXP + streakBonusXP + accuracyBonusXP;

  return {
    total,
    passedCount,
    passRate,
    avgScore,
    tierInfo,
    avgTimePerTurn,
    avgLatency,
    speedRating,
    vinglishCount,
    vinglishFreePercent,
    maxStreak,
    earnedXP,
    xpBreakdown: {
      baseXP,
      speedBonusXP,
      streakBonusXP,
      accuracyBonusXP,
    },
  };
}

export function getUserStats(): UserStats {
  if (typeof window === 'undefined') {
    return {
      totalXP: 0,
      totalSessions: 0,
      dailyStreak: 1,
      lastActiveDate: '',
      bestTier: 'B',
    };
  }
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { totalXP: 0, totalSessions: 0, dailyStreak: 1, lastActiveDate: '', bestTier: 'B' };
    return JSON.parse(raw) as UserStats;
  } catch {
    return { totalXP: 0, totalSessions: 0, dailyStreak: 1, lastActiveDate: '', bestTier: 'B' };
  }
}

export function recordSessionCompletion(details: SessionScoreDetails): UserStats {
  if (typeof window === 'undefined') return getUserStats();
  const current = getUserStats();
  const today = new Date().toISOString().slice(0, 10);

  let newStreak = current.dailyStreak || 1;
  if (current.lastActiveDate) {
    const lastDate = new Date(current.lastActiveDate);
    const currDate = new Date(today);
    const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  // Tier ranking priority
  const tierOrder: Record<ReflexRankTier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const currentTierScore = tierOrder[current.bestTier || 'B'] || 3;
  const newTierScore = tierOrder[details.tierInfo.tier] || 1;
  const bestTier = newTierScore > currentTierScore ? details.tierInfo.tier : current.bestTier;

  const nextStats: UserStats = {
    totalXP: (current.totalXP || 0) + details.earnedXP,
    totalSessions: (current.totalSessions || 0) + 1,
    dailyStreak: newStreak,
    lastActiveDate: today,
    bestTier,
  };

  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(nextStats));
  } catch (err) {
    console.warn('[recordSessionCompletion] save failed', err);
  }

  return nextStats;
}

export interface ListeningTurnScore {
  id: string;
  mode: string;
  englishText: string;
  vietnameseMeaning: string;
  userInput: string;
  score: number; // 0 - 100
  isCorrect: boolean; // score >= 70
  feedback: string;
  soundExplanation?: string;
  latency?: number | null;
  timeSpentSeconds?: number;
}

export interface ListeningSessionSummary {
  total: number;
  passedCount: number;
  passRate: number;
  avgScore: number;
  tierInfo: TierInfo;
  avgLatency: number | null;
  speedRating: { label: string; tone: string } | null;
  earnedXP: number;
  turns: ListeningTurnScore[];
}

export function computeListeningSessionScore(turns: ListeningTurnScore[]): ListeningSessionSummary {
  const total = turns.length || 1;
  const passedCount = turns.filter((t) => t.isCorrect).length;
  const passRate = Math.round((passedCount / total) * 100);

  const avgScore = Math.round(
    turns.reduce((acc, t) => acc + (t.score || 0), 0) / total,
  );

  const tierInfo = getTierInfo(avgScore);

  const validLatencies = turns
    .map((t) => t.latency)
    .filter((l): l is number => typeof l === 'number' && !isNaN(l) && l >= 0);

  const avgLatency = validLatencies.length
    ? Number((validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length).toFixed(1))
    : null;

  let speedRating: { label: string; tone: string } | null = null;
  if (avgLatency !== null) {
    if (avgLatency <= 1.2) {
      speedRating = { label: 'Tia chớp (Tức thì)', tone: 'text-amber-400 font-bold' };
    } else if (avgLatency <= 2.2) {
      speedRating = { label: 'Bắt âm rất nhanh', tone: 'text-emerald-400 font-semibold' };
    } else if (avgLatency <= 3.5) {
      speedRating = { label: 'Khá ổn', tone: 'text-indigo-300' };
    } else {
      speedRating = { label: 'Cần tăng tốc phản xạ', tone: 'text-slate-400' };
    }
  }

  // XP calculation
  const baseXP = avgScore * total;
  const speedBonusXP = avgLatency !== null && avgLatency <= 1.5 ? 100 : 0;
  const accuracyBonusXP = passRate >= 80 ? 150 : passRate >= 60 ? 50 : 0;
  const earnedXP = baseXP + speedBonusXP + accuracyBonusXP;

  return {
    total,
    passedCount,
    passRate,
    avgScore,
    tierInfo,
    avgLatency,
    speedRating,
    earnedXP,
    turns,
  };
}

export function recordListeningSessionCompletion(summary: ListeningSessionSummary): UserStats {
  if (typeof window === 'undefined') return getUserStats();
  const current = getUserStats();
  const today = new Date().toISOString().slice(0, 10);

  let newStreak = current.dailyStreak || 1;
  if (current.lastActiveDate) {
    const lastDate = new Date(current.lastActiveDate);
    const currDate = new Date(today);
    const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  const tierOrder: Record<ReflexRankTier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  const currentTierScore = tierOrder[current.bestTier || 'B'] || 3;
  const newTierScore = tierOrder[summary.tierInfo.tier] || 1;
  const bestTier = newTierScore > currentTierScore ? summary.tierInfo.tier : current.bestTier;

  const nextStats: UserStats = {
    totalXP: (current.totalXP || 0) + summary.earnedXP,
    totalSessions: (current.totalSessions || 0) + 1,
    dailyStreak: newStreak,
    lastActiveDate: today,
    bestTier,
  };

  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(nextStats));
  } catch (err) {
    console.warn('[recordListeningSessionCompletion] save failed', err);
  }

  return nextStats;
}
