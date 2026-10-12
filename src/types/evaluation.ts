import type { DifficultyLevel } from './practice';

/** Single item sent from the client to /api/evaluate (task spec §5.1). */
export interface EvaluationInputItem {
  id: number;
  vi: string;
  userEn: string;
  referenceEn?: string;
  partnerQuestion?: string;
}

/** Request payload for POST /api/evaluate. */
export interface BatchEvaluationRequest {
  level: DifficultyLevel;
  sentences: EvaluationInputItem[];
}

/** Raw item shape the LLM must return (snake_case, task spec §5.2). */
export interface RawAIEvaluationItem {
  id: number;
  is_correct: boolean;
  score: number;
  native_version: string;
  tip: string;
  vinglish_alert?: string | null;
}

/** Normalized item consumed by the UI. */
export interface EvaluationItemResult {
  id: string;
  isCorrect: boolean;
  score: number;
  nativeVersion: string;
  tip: string;
  vinglishAlert?: string | null;
}

export interface BatchEvaluationResponse {
  level: DifficultyLevel;
  results: EvaluationItemResult[];
  overallFeedback?: string;
  provider?: AIProviderName;
}

export interface EvaluationErrorResponse {
  error: string;
  code: 'BAD_REQUEST' | 'AI_UNAVAILABLE' | 'AI_INVALID_OUTPUT' | 'INTERNAL';
}

export type AIProviderName = 'gemini' | 'groq' | 'ollama' | 'deepseek';

/** Contract every AI adapter in src/services/ai must implement. */
export interface AIEvaluationProvider {
  readonly name: AIProviderName;
  isConfigured(): boolean;
  evaluate(request: BatchEvaluationRequest): Promise<EvaluationItemResult[]>;
}
