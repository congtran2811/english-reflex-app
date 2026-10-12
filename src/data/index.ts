import type { DifficultyLevel, LevelMeta, PracticePrompt } from '@/types/practice';
import { SESSION_LENGTH } from '@/lib/constants';
import { shuffle } from '@/lib/utils';
import levels from './levels.json';
import a1a2 from './sentences/a1_a2.json';
import b1 from './sentences/b1.json';
import b2 from './sentences/b2.json';
import c1 from './sentences/c1.json';
import { DIALOGUE_BANK } from './dialogueBank';

const BANK: Record<DifficultyLevel, PracticePrompt[]> = {
  A1_A2: a1a2 as PracticePrompt[],
  B1: b1 as PracticePrompt[],
  B2: b2 as PracticePrompt[],
  C1: c1 as PracticePrompt[],
};

export const LEVELS = levels as LevelMeta[];

export function getLevelMeta(level: DifficultyLevel): LevelMeta | undefined {
  return LEVELS.find((l) => l.id === level);
}

/* ---------------- AI pool + history (localStorage) ---------------- */

const POOL_KEY = (level: DifficultyLevel, topicId: string = 'all', isDialogue: boolean = false) =>
  `reflex.aiPool.v7_ai_priority.${level}.${topicId}${isDialogue ? '.dialogue' : ''}`;
const SEEN_KEY = (level: DifficultyLevel) => `reflex.seen.v7.${level}`;
const SEEN_LIMIT = 300;
const inflight = new Set<string>();

function isValidPrompt(p: PracticePrompt, isDialogue: boolean): boolean {
  if (!p) return false;
  if (!isDialogue) return Boolean(p.vietnamese?.trim() && p.referenceTranslation?.trim());
  if (!p.partnerQuestion?.trim() || !p.referenceTranslation?.trim()) return false;
  const qClean = p.partnerQuestion.toLowerCase().replace(/[^a-z0-9]/g, '');
  const refClean = p.referenceTranslation.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (qClean === refClean || (refClean.length > 8 && qClean.includes(refClean))) return false;
  return true;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

/** Fetch fresh AI sentences in the background until the pool has >= 2 sessions' worth. */
export async function prefetchAIPrompts(
  level: DifficultyLevel,
  topicId: string = 'all',
  topicPrompt?: string,
  isDialogueMode: boolean = false,
): Promise<void> {
  const inflightKey = `${level}:${topicId}:${isDialogueMode}`;
  if (typeof window === 'undefined' || inflight.has(inflightKey)) return;
  const rawPool = readJSON<PracticePrompt[]>(POOL_KEY(level, topicId, isDialogueMode), []);
  const pool = rawPool.filter((p) => isValidPrompt(p, isDialogueMode));
  if (pool.length >= SESSION_LENGTH * 2) return;
  inflight.add(inflightKey);
  try {
    const seen = new Set(readJSON<string[]>(SEEN_KEY(level), []));
    const avoid = Array.from(seen).slice(-60);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, count: SESSION_LENGTH, avoid, topicPrompt, isDialogueMode }),
    });
    if (!res.ok) return;
    const { prompts } = (await res.json()) as { prompts: PracticePrompt[] };
    const fresh = (prompts || []).filter(
      (p) => isValidPrompt(p, isDialogueMode) && !seen.has(p.vietnamese) && !seen.has(p.partnerQuestion || ''),
    );
    writeJSON(
      POOL_KEY(level, topicId, isDialogueMode),
      [...pool, ...fresh],
    );
  } catch (err) {
    console.warn('[prefetchAIPrompts]', err);
  } finally {
    inflight.delete(inflightKey);
  }
}

/** Ensure prompts for a session: STRICTLY prioritizes AI generation to avoid static repetition. */
export async function getOrGenerateSessionPrompts(
  level: DifficultyLevel,
  count: number = SESSION_LENGTH,
  topicId: string = 'all',
  topicPrompt?: string,
  isDialogueMode: boolean = false,
): Promise<PracticePrompt[]> {
  const rawPool = readJSON<PracticePrompt[]>(POOL_KEY(level, topicId, isDialogueMode), []);
  const pool = rawPool.filter((p) => isValidPrompt(p, isDialogueMode));
  const seenList = readJSON<string[]>(SEEN_KEY(level), []);

  // 1. If AI pool already has enough fresh prompts, consume them & prefetch more
  if (pool.length >= count) {
    const picked = pool.slice(0, count);
    writeJSON(POOL_KEY(level, topicId, isDialogueMode), pool.slice(count));
    const newSeen = [
      ...seenList,
      ...picked.map((p) => p.vietnamese),
      ...picked.map((p) => p.partnerQuestion || ''),
    ].filter(Boolean);
    writeJSON(SEEN_KEY(level), newSeen.slice(-SEEN_LIMIT));
    void prefetchAIPrompts(level, topicId, topicPrompt, isDialogueMode);
    return picked;
  }

  // 2. Fetch fresh dynamic prompts directly from AI via /api/generate
  const avoid = seenList.slice(-60);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, count, avoid, topicPrompt, isDialogueMode }),
      });

      if (res.ok) {
        const data = (await res.json()) as { prompts?: PracticePrompt[] };
        const validPrompts = (data.prompts || []).filter((p) => isValidPrompt(p, isDialogueMode));

        if (validPrompts.length > 0) {
          // Combine with any existing pool prompts if needed
          const combined = [...pool, ...validPrompts];
          const picked = combined.slice(0, count);
          const remainder = combined.slice(count);

          writeJSON(POOL_KEY(level, topicId, isDialogueMode), remainder);
          const newSeen = [
            ...seenList,
            ...picked.map((p) => p.vietnamese),
            ...picked.map((p) => p.partnerQuestion || ''),
          ].filter(Boolean);
          writeJSON(SEEN_KEY(level), newSeen.slice(-SEEN_LIMIT));

          void prefetchAIPrompts(level, topicId, topicPrompt, isDialogueMode);
          return picked;
        }
      }
    } catch (err) {
      console.warn(`[getOrGenerateSessionPrompts] AI generation attempt ${attempt} failed:`, err);
    }
  }

  // 3. If there are any partial AI prompts in pool, prioritize them over static bank
  if (pool.length > 0) {
    writeJSON(POOL_KEY(level, topicId, isDialogueMode), []);
    return pool;
  }

  // 4. Absolute emergency fallback ONLY if network or AI server is completely offline
  return pickSessionPrompts(level, count, isDialogueMode);
}

/** Pick prompts from local bank (emergency offline fallback only). */
export function pickSessionPrompts(
  level: DifficultyLevel,
  count: number = SESSION_LENGTH,
  isDialogueMode: boolean = false,
): PracticePrompt[] {
  const seenKey = isDialogueMode ? `${SEEN_KEY(level)}.dialogue` : SEEN_KEY(level);
  const seenList = readJSON<string[]>(seenKey, []);
  const seen = new Set(seenList);
  const bank = shuffle(isDialogueMode ? (DIALOGUE_BANK[level] || DIALOGUE_BANK.B1) : BANK[level]);
  const unseen = bank.filter((p) => !seen.has(p.vietnamese));
  const rest = bank.filter((p) => seen.has(p.vietnamese));
  const picked = [...unseen, ...rest].slice(0, count);
  writeJSON(seenKey, [...seenList, ...picked.map((p) => p.vietnamese)].slice(-SEEN_LIMIT));

  return picked;
}

