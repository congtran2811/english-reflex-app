import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DIFFICULTY_LEVELS, type DifficultyLevel } from '@/types/practice';
import { generatePrompts } from '@/services/ai/generate.service';

export const runtime = 'nodejs';

const schema = z.object({
  level: z.enum(DIFFICULTY_LEVELS as unknown as [string, ...string[]]),
  count: z.number().int().min(1).max(20).default(10),
  avoid: z.array(z.string().max(300)).max(60).default([]),
  topicPrompt: z.string().max(200).optional(),
  isDialogueMode: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const { level, count, avoid, topicPrompt, isDialogueMode } = parsed.data;
    const prompts = await generatePrompts(level as DifficultyLevel, count, avoid, topicPrompt, isDialogueMode);
    return NextResponse.json({ prompts });
  } catch (err) {
    console.error('[api/generate]', err);
    return NextResponse.json({ error: 'AI generation unavailable' }, { status: 503 });
  }
}
