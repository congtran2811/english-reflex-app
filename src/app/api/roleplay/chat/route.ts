import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chatRoleplayTurn, ROLEPLAY_SCENARIOS } from '@/services/ai/roleplay.service';

export const runtime = 'nodejs';

const chatSchema = z.object({
  scenarioId: z.string().min(1),
  userSpeech: z.string().min(1),
  customScenario: z
    .object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      icon: z.string(),
      persona: z.string(),
      context: z.string(),
      openingLine: z.string(),
      starterSuggestions: z.array(z.string()),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      }),
    )
    .default([]),
});

export async function GET() {
  return NextResponse.json({ scenarios: ROLEPLAY_SCENARIOS });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { scenarioId, history, userSpeech, customScenario } = parsed.data;
    const result = await chatRoleplayTurn(scenarioId, history, userSpeech, customScenario);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/roleplay/chat]', err);
    return NextResponse.json(
      { error: 'Không thể kết nối tới AI phản hồi vai diễn lúc này.' },
      { status: 500 },
    );
  }
}
