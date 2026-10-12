import 'server-only';
import type { AIEvaluationProvider, BatchEvaluationRequest, EvaluationItemResult } from '@/types/evaluation';
import { getServerEnv } from '@/lib/env';
import { AI_REQUEST_TIMEOUT_MS } from '@/lib/constants';
import { buildEvaluationPrompt, fetchWithTimeout, parseEvaluationOutput } from './shared';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export const geminiService: AIEvaluationProvider = {
  name: 'gemini',

  isConfigured() {
    return Boolean(getServerEnv().GEMINI_API_KEY);
  },

  async evaluate(request: BatchEvaluationRequest): Promise<EvaluationItemResult[]> {
    const { GEMINI_API_KEY, GEMINI_MODEL } = getServerEnv();
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildEvaluationPrompt(request) }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      },
      AI_REQUEST_TIMEOUT_MS,
    );

    const data = (await res.json()) as GeminiResponse;
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${data.error?.message ?? 'unknown'}`);

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response');
    return parseEvaluationOutput(text, request);
  },
};
