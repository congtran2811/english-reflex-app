import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCustomScenario } from '@/services/ai/roleplay.service';

export const runtime = 'nodejs';

const generateSchema = z.object({
  topicDescription: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  try {
    const { topicDescription } = parsed.data;
    const scenario = await generateCustomScenario(topicDescription);
    return NextResponse.json({ scenario });
  } catch (err) {
    console.error('[api/roleplay/generate]', err);
    return NextResponse.json({ error: 'Không thể tạo kịch bản lúc này' }, { status: 500 });
  }
}
