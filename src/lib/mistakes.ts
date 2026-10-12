'use client';

import type { CompletedTurn } from '@/types/practice';
import type { EvaluationItemResult } from '@/types/evaluation';

export interface SavedMistakeItem {
  id: string; // unique ID
  promptId: string;
  vietnamese: string;
  userTranscript: string;
  nativeVersion: string;
  partnerQuestion?: string;
  tip?: string;
  score: number;
  level: string;
  savedAt: number; // timestamp
  isMastered?: boolean;
}

const MISTAKES_STORAGE_KEY = 'reflex.mistakes.v1';

export function getSavedMistakes(): SavedMistakeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MISTAKES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedMistakeItem[]) : [];
  } catch {
    return [];
  }
}

export function saveMistake(item: Omit<SavedMistakeItem, 'id' | 'savedAt'>): SavedMistakeItem {
  const current = getSavedMistakes();
  // Check if this vietnamese sentence is already in mistakes bank
  const existingIdx = current.findIndex((m) => m.vietnamese === item.vietnamese);
  const newItem: SavedMistakeItem = {
    ...item,
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    savedAt: Date.now(),
  };

  let next: SavedMistakeItem[];
  if (existingIdx >= 0) {
    next = [...current];
    next[existingIdx] = newItem;
  } else {
    next = [newItem, ...current];
  }

  // Cap at 200 items
  if (next.length > 200) next = next.slice(0, 200);

  localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(next));
  return newItem;
}

export function removeMistake(id: string): void {
  const current = getSavedMistakes();
  const next = current.filter((m) => m.id !== id);
  localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(next));
}

export function toggleMastered(id: string): void {
  const current = getSavedMistakes();
  const next = current.map((m) => (m.id === id ? { ...m, isMastered: !m.isMastered } : m));
  localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(next));
}

export function autoSaveLowScoreTurn(
  turn: CompletedTurn,
  result: EvaluationItemResult,
  level: string
): void {
  // Auto-save if score is under 70 (mistake)
  if (result.score < 70) {
    saveMistake({
      promptId: turn.promptId,
      vietnamese: turn.vietnamese,
      userTranscript: turn.userTranscript,
      nativeVersion: result.nativeVersion,
      partnerQuestion: turn.partnerQuestion,
      tip: result.tip,
      score: result.score,
      level,
    });
  }
}
