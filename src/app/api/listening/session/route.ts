import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateListeningSession } from '@/services/ai/listening.service';

export const runtime = 'nodejs';

const generateQuerySchema = z.object({
  level: z.string().default('B1'),
  topic: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = generateQuerySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  try {
    const { level, topic } = parsed.data;
    const items = await generateListeningSession(level, topic);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[api/listening/session] error:', err);
    return NextResponse.json({ error: 'Failed to generate listening session' }, { status: 500 });
  }
}
