export type DifficultyLevel = 'A1_A2' | 'B1' | 'B2' | 'C1';

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ['A1_A2', 'B1', 'B2', 'C1'] as const;

export interface PracticePrompt {
  id: string;
  level: DifficultyLevel;
  vietnamese: string;
  referenceTranslation?: string;
  partnerQuestion?: string; // For dialogue/ping-pong mode (e.g. "Why were you late today?")
}

export interface CompletedTurn {
  promptId: string;
  vietnamese: string;
  userTranscript: string;
  timeSpentSeconds: number;
  firstSpeechLatency?: number | null; // Seconds until user started speaking
  referenceTranslation?: string;
  partnerQuestion?: string;
  audioUrl?: string | null; // Recorded user speech for shadowing comparison
}

export type SessionStatus = 'ready' | 'practicing' | 'paused' | 'reviewing' | 'evaluating' | 'completed' | 'error';

export interface LevelMeta {
  id: DifficultyLevel;
  label: string;
  title: string;
  description: string;
  targetSeconds: number;
  tags: string[];
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'string' && (DIFFICULTY_LEVELS as readonly string[]).includes(value);
}
