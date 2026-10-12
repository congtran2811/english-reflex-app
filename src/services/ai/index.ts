import 'server-only';
import type {
  AIEvaluationProvider,
  AIProviderName,
  BatchEvaluationRequest,
  EvaluationItemResult,
} from '@/types/evaluation';
import { getServerEnv } from '@/lib/env';
import { geminiService } from './gemini.service';
import { groqService } from './groq.service';
import { ollamaService } from './ollama.service';
import { deepseekService } from './deepseek.service';

const PROVIDERS: Record<AIProviderName, AIEvaluationProvider> = {
  ollama: ollamaService,
  deepseek: deepseekService,
  gemini: geminiService,
  groq: groqService,
};

export class AIUnavailableError extends Error {
  constructor(public readonly causes: string[]) {
    super(`All AI providers failed: ${causes.join(' | ')}`);
    this.name = 'AIUnavailableError';
  }
}

/** Ordered provider chain: primary first, then any other configured provider. */
function getProviderChain(): AIEvaluationProvider[] {
  const primary = getServerEnv().AI_PRIMARY_PROVIDER;
  const all: AIProviderName[] = ['ollama', 'deepseek', 'gemini', 'groq'];
  const order: AIProviderName[] = [primary, ...all.filter((p) => p !== primary)];
  return order.map((n) => PROVIDERS[n]).filter((p) => p.isConfigured());
}

/**
 * Unified evaluation entry point with automatic failover (structure.md §3.3).
 */
export async function evaluateBatch(
  request: BatchEvaluationRequest,
): Promise<{ provider: AIProviderName; results: EvaluationItemResult[] }> {
  const chain = getProviderChain();
  if (chain.length === 0) {
    throw new AIUnavailableError(['No AI provider configured. Set GEMINI_API_KEY or GROQ_API_KEY in .env.local']);
  }

  const causes: string[] = [];
  for (const provider of chain) {
    try {
      const results = await provider.evaluate(request);
      return { provider: provider.name, results };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ai:${provider.name}]`, msg);
      causes.push(`${provider.name}: ${msg}`);
    }
  }
  throw new AIUnavailableError(causes);
}
