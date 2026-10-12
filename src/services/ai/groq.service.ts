import 'server-only';
import type { AIEvaluationProvider, BatchEvaluationRequest, EvaluationItemResult } from '@/types/evaluation';
import { getServerEnv } from '@/lib/env';
import { AI_REQUEST_TIMEOUT_MS } from '@/lib/constants';
import { buildEvaluationPrompt, fetchWithTimeout, parseEvaluationOutput } from './shared';

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export const groqService: AIEvaluationProvider = {
  name: 'groq',

  isConfigured() {
    return Boolean(getServerEnv().GROQ_API_KEY);
  },

  async evaluate(request: BatchEvaluationRequest): Promise<EvaluationItemResult[]> {
    const { GROQ_API_KEY, GROQ_MODEL } = getServerEnv();
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');

    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You output only valid JSON. No prose, no markdown.' },
            { role: 'user', content: buildEvaluationPrompt(request) },
          ],
        }),
      },
      AI_REQUEST_TIMEOUT_MS,
    );

    const data = (await res.json()) as GroqResponse;
    if (!res.ok) throw new Error(`Groq error ${res.status}: ${data.error?.message ?? 'unknown'}`);

    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('Groq returned an empty response');
    return parseEvaluationOutput(text, request);
  },
};
