import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateBatch, AIUnavailableError } from '@/services/ai';
import { DIFFICULTY_LEVELS } from '@/types/practice';
import type { BatchEvaluationResponse, EvaluationErrorResponse } from '@/types/evaluation';
import { NO_RESPONSE_PLACEHOLDER, SESSION_LENGTH } from '@/lib/constants';

export const runtime = 'nodejs';

const requestSchema = z.object({
  level: z.enum(DIFFICULTY_LEVELS as unknown as [string, ...string[]]),
  sentences: z
    .array(
      z.object({
        id: z.number().int(),
        vi: z.string().min(1).max(500),
        userEn: z.string().max(1000),
        referenceEn: z.string().max(1000).optional(),
        partnerQuestion: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(SESSION_LENGTH),
});

function errorResponse(body: EvaluationErrorResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse({ error: 'Invalid JSON body', code: 'BAD_REQUEST' }, 400);
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse({ error: parsed.error.message, code: 'BAD_REQUEST' }, 400);
  }

  const request = {
    level: parsed.data.level as BatchEvaluationResponse['level'],
    sentences: parsed.data.sentences.map((s) => ({
      ...s,
      userEn: s.userEn.trim() || NO_RESPONSE_PLACEHOLDER,
    })),
  };

  try {
    const { provider, results } = await evaluateBatch(request);
    const body: BatchEvaluationResponse = { level: request.level, results, provider };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return errorResponse({ error: 'AI evaluation is temporarily unavailable. Please try again.', code: 'AI_UNAVAILABLE' }, 503);
    }
    console.error('[api/evaluate]', err);
    return errorResponse({ error: 'Unexpected server error', code: 'INTERNAL' }, 500);
  }
}
