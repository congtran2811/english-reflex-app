import 'server-only';
import type {
  BatchEvaluationRequest,
  EvaluationItemResult,
  RawAIEvaluationItem,
} from '@/types/evaluation';
import { NO_RESPONSE_PLACEHOLDER } from '@/lib/constants';
import { extractJson } from '@/lib/utils';

/** Shared evaluation prompt with strict per-sentence translation & dialogue ping-pong instructions. */
export function buildEvaluationPrompt(request: BatchEvaluationRequest): string {
  const isSingle = request.sentences.length === 1;
  const sentenceDescriptions = request.sentences
    .map((s) => {
      const parts = [`Item ID ${s.id}:`];
      if (s.partnerQuestion) {
        parts.push(`- MODE: DIALOGUE PING-PONG (CONVERSATION RESPONSE)`);
        parts.push(`- Partner's spoken question/statement: "${s.partnerQuestion}"`);
        parts.push(`- Student's response intention (Vietnamese hint): "${s.vi}"`);
        if (s.referenceEn) {
          parts.push(`- Reference English response: "${s.referenceEn}"`);
        }
        parts.push(`- Student's actual spoken response: "${s.userEn || NO_RESPONSE_PLACEHOLDER}"`);
      } else {
        parts.push(`- MODE: REFLEX TRANSLATION`);
        parts.push(`- Vietnamese prompt to translate: "${s.vi}"`);
        if (s.referenceEn) {
          parts.push(`- Reference translation: "${s.referenceEn}"`);
        }
        parts.push(`- Student said: "${s.userEn || NO_RESPONSE_PLACEHOLDER}"`);
      }
      return parts.join('\n');
    })
    .join('\n\n');

  return `You are an expert native English language examiner evaluating a Vietnamese student's spoken English reflex and conversation response.
Learner CEFR level: ${request.level}.

CRITICAL EVALUATION RULES:
1. DIALOGUE PING-PONG MODE (Items marked with MODE: DIALOGUE PING-PONG):
   - The user is in a conversational roleplay. The partner said "Partner's spoken question/statement". The student was prompted with the Vietnamese hint ("Student's response intention") and spoke "Student's actual spoken response".
   - CRITICAL: DO NOT evaluate or grade based on the partner's question! The student was NOT asked to say or translate the question.
   - Evaluate whether the student's actual spoken response appropriately, naturally, and grammatically answers the partner's question while fulfilling the intended Vietnamese meaning.
   - "native_version" MUST BE THE NATURAL ENGLISH ANSWER / RESPONSE (ĐÁP ÁN ĐÁP LẠI LỜI ĐỐI TÁC). UNDER NO CIRCUMSTANCES should you output the partner's question as "native_version"!
   - "tip" MUST be constructive feedback in Vietnamese directly addressing the STUDENT'S ANSWER (grammar, vocabulary, conversational etiquette, and natural phrasing).
   - "score" is an integer from 0 to 100 based on the quality of the student's response.

2. REFLEX TRANSLATION MODE (Items marked with MODE: REFLEX TRANSLATION):
   - "native_version" MUST be a natural, accurate English translation corresponding directly to that sentence's Vietnamese text.
   - "tip" is a brief, helpful advice in Vietnamese explaining how to correct any translation mistakes.

3. COMMON RULES:
   - If the student answer is "${NO_RESPONSE_PLACEHOLDER}" or blank, set score=0 and is_correct=false, tip="Chưa ghi nhận câu trả lời. Hãy bấm nói to và rõ hơn nhé!".
   - "score" is an integer from 0 to 100.
   - "is_correct" is true if score >= 70, otherwise false.
   - "vinglish_alert": Check if the student made a typical Vietnamese word-by-word literal translation error in their spoken response (e.g. "open the light", "I very like", "smoke cigarette", "learn with Mr Nam", omitting articles/prepositions, unnatural collocations). If detected, explain briefly in Vietnamese (e.g. "Lỗi dịch thô: Dùng 'open the light' thay vì 'turn on the light'"). If none detected or answer is good, return null.
   - All tips and feedback MUST be encouraging, clear, and written in Vietnamese.

Sentences to evaluate:
${sentenceDescriptions}

Respond ONLY with valid JSON ${isSingle ? 'object' : 'array'} containing:
${isSingle ? `{
  "id": 1,
  "is_correct": boolean,
  "score": number,
  "native_version": "the natural English answer/response (NEVER repeat the question/prompt)",
  "tip": string,
  "vinglish_alert": string | null
}` : `[
  {
    "id": 1,
    "is_correct": boolean,
    "score": number,
    "native_version": "the natural English answer/response (NEVER repeat the question/prompt)",
    "tip": string,
    "vinglish_alert": string | null
  }
]`}
`;
}

function isRawItem(v: unknown): v is RawAIEvaluationItem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const hasNative = typeof o.native_version === 'string' || typeof o.nativeVersion === 'string';
  if (hasNative && !o.native_version && typeof o.nativeVersion === 'string') {
    o.native_version = o.nativeVersion;
  }
  if (o.id === undefined) {
    o.id = 1;
  }
  return hasNative;
}

/**
 * Parse + normalize LLM text into UI results. Guarantees one result per input
 * sentence; missing items are filled with a safe fallback.
 */
export function parseEvaluationOutput(
  text: string,
  request: BatchEvaluationRequest,
): EvaluationItemResult[] {
  const parsed = extractJson(text);
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { data?: unknown[] })?.data)
      ? (parsed as { data: unknown[] }).data
      : Array.isArray((parsed as { results?: unknown[] })?.results)
        ? (parsed as { results: unknown[] }).results
        : Array.isArray((parsed as { items?: unknown[] })?.items)
          ? (parsed as { items: unknown[] }).items
          : isRawItem(parsed)
            ? [parsed]
            : [];

  const byId = new Map<string, RawAIEvaluationItem>();
  for (const item of arr) {
    if (isRawItem(item)) byId.set(String(item.id), item);
  }
  if (byId.size === 0) throw new Error('AI returned no valid evaluation items');

  return request.sentences.map((s) => {
    const raw = byId.get(String(s.id));
    const noResponse = !s.userEn.trim() || s.userEn === NO_RESPONSE_PLACEHOLDER;
    if (!raw) {
      return { id: String(s.id), isCorrect: false, score: 0, nativeVersion: s.referenceEn || '—', tip: 'Evaluation unavailable for this item.' };
    }
    const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
    const vinglish =
      typeof raw.vinglish_alert === 'string' && raw.vinglish_alert.trim()
        ? raw.vinglish_alert.trim()
        : null;

    let nativeVersion = typeof raw.native_version === 'string' ? raw.native_version.trim() : '';

    // Guardrail: Ensure nativeVersion is an ANSWER, never the question/prompt
    if (s.partnerQuestion) {
      const qNorm = s.partnerQuestion.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nativeNorm = nativeVersion.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isEchoingQuestion =
        !nativeVersion ||
        nativeNorm === qNorm ||
        (nativeNorm.length > 8 && qNorm.includes(nativeNorm)) ||
        (nativeVersion.endsWith('?') && !s.referenceEn?.endsWith('?') && !s.vi.endsWith('?'));

      if (isEchoingQuestion && s.referenceEn && s.referenceEn.toLowerCase().replace(/[^a-z0-9]/g, '') !== qNorm) {
        nativeVersion = s.referenceEn;
      }
    } else {
      if (!nativeVersion || nativeVersion === s.vi) {
        if (s.referenceEn) nativeVersion = s.referenceEn;
      }
    }

    return {
      id: String(s.id),
      isCorrect: noResponse ? false : Boolean(raw.is_correct),
      score: noResponse ? 0 : score,
      nativeVersion: nativeVersion || s.referenceEn || '—',
      tip: typeof raw.tip === 'string' ? raw.tip : '',
      vinglishAlert: noResponse ? null : vinglish,
    };
  });
}

/** fetch with an AbortController timeout. */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
