import 'server-only';
import type { AIEvaluationProvider, BatchEvaluationRequest, EvaluationItemResult } from '@/types/evaluation';
import { getServerEnv } from '@/lib/env';
import { AI_REQUEST_TIMEOUT_MS } from '@/lib/constants';
import { buildEvaluationPrompt, fetchWithTimeout, parseEvaluationOutput } from './shared';

interface DeepSeekResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export const deepseekService: AIEvaluationProvider = {
  name: 'deepseek',

  isConfigured() {
    return Boolean(getServerEnv().DEEPSEEK_API_KEY);
  },

  async evaluate(request: BatchEvaluationRequest): Promise<EvaluationItemResult[]> {
    const { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } = getServerEnv();
    if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not configured');

    const cleanBase = DEEPSEEK_BASE_URL.replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/v1') ? `${cleanBase}/chat/completions` : `${cleanBase}/chat/completions`;

    const res = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL || 'deepseek-chat',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are an expert English examiner evaluating spoken reflex translations. Respond ONLY with a valid JSON array as requested. No prose, no markdown.',
            },
            {
              role: 'user',
              content: buildEvaluationPrompt(request),
            },
          ],
        }),
      },
      AI_REQUEST_TIMEOUT_MS,
    );

    const data = (await res.json()) as DeepSeekResponse;
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${data.error?.message ?? 'unknown'}`);

    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new Error('DeepSeek returned an empty response');
    return parseEvaluationOutput(text, request);
  },
};
