import 'server-only';
import type { AIEvaluationProvider, BatchEvaluationRequest, EvaluationItemResult } from '@/types/evaluation';
import { getServerEnv } from '@/lib/env';
import { AI_REQUEST_TIMEOUT_MS } from '@/lib/constants';
import { buildEvaluationPrompt, fetchWithTimeout, parseEvaluationOutput } from './shared';

interface OllamaTagResponse {
  models?: { name: string }[];
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

/** Check which model is available in Ollama, using preferred model if present, or falling back to any installed model. */
export async function resolveOllamaModel(baseUrl: string, preferredModel: string): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const tagsRes = await fetchWithTimeout(`${cleanBase}/api/tags`, { method: 'GET' }, 5000).catch(() => null);
  if (!tagsRes || !tagsRes.ok) {
    throw new Error(`Không thể kết nối tới Ollama tại ${cleanBase}. Hãy đảm bảo ứng dụng Ollama đang chạy.`);
  }

  const tagsData = (await tagsRes.json().catch(() => ({}))) as OllamaTagResponse;
  const models = (tagsData.models ?? []).map((m) => m.name);

  if (models.length === 0) {
    throw new Error(
      `Ollama đang chạy nhưng chưa có model nào được tải về. Hãy mở Terminal và chạy lệnh:\nollama run ${preferredModel}`,
    );
  }

  // Exact or prefix match (e.g. "qwen2.5:3b" matches "qwen2.5:3b-instruct" or "qwen2.5:3b")
  const exact = models.find((m) => m === preferredModel || m.startsWith(`${preferredModel}:`));
  if (exact) return exact;

  const closeMatch = models.find((m) => m.includes(preferredModel.split(':')[0]));
  if (closeMatch) return closeMatch;

  // Use the first installed model
  return models[0];
}

export const ollamaService: AIEvaluationProvider = {
  name: 'ollama',

  isConfigured() {
    return Boolean(getServerEnv().OLLAMA_BASE_URL);
  },

  async evaluate(request: BatchEvaluationRequest): Promise<EvaluationItemResult[]> {
    const { OLLAMA_BASE_URL, OLLAMA_MODEL } = getServerEnv();
    const cleanBase = OLLAMA_BASE_URL.replace(/\/+$/, '');

    // Resolve model dynamically so it works with any pulled model
    const resolvedModel = await resolveOllamaModel(cleanBase, OLLAMA_MODEL);

    const res = await fetchWithTimeout(
      `${cleanBase}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: resolvedModel,
          format: 'json',
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert English examiner evaluating spoken reflex translations. Respond ONLY with a valid JSON array as requested.',
            },
            {
              role: 'user',
              content: buildEvaluationPrompt(request),
            },
          ],
          options: {
            temperature: 0.2,
          },
        }),
      },
      AI_REQUEST_TIMEOUT_MS,
    );

    const data = (await res.json().catch(() => ({}))) as OllamaChatResponse;
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${data.error ?? 'unknown'}`);

    const text = data.message?.content ?? '';
    if (!text) throw new Error('Ollama returned an empty response');
    return parseEvaluationOutput(text, request);
  },
};
