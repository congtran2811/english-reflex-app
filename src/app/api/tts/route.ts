import { NextResponse } from 'next/server';
import { z } from 'zod';
import { EdgeTTS } from '@andresaya/edge-tts';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const runtime = 'nodejs';

export const POPULAR_NEURAL_VOICES = [
  { id: 'en-US-JennyNeural', name: 'Jenny (Nữ - Mỹ, tự nhiên & ấm áp)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (Nam - Mỹ, trầm ấm & đĩnh đạc)', lang: 'en-US', gender: 'Male' },
  { id: 'en-US-AriaNeural', name: 'Aria (Nữ - Mỹ, sôi nổi & biểu cảm)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher (Nam - Mỹ, phong thái người dẫn chuyện)', lang: 'en-US', gender: 'Male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Nữ - Anh/London, thanh lịch)', lang: 'en-GB', gender: 'Female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Nam - Anh/London, điềm đạm)', lang: 'en-GB', gender: 'Male' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (Nữ - Úc, thân thiện)', lang: 'en-AU', gender: 'Female' },
];

// In-memory audio buffer cache to make replays instant and resilient
const ttsAudioCache = new Map<string, Buffer>();

function humanizeSpokenText(text: string): string {
  return text
    // Strip surrounding quotes that LLMs sometimes output
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    // Replace multiple punctuation with clean punctuation
    .replace(/[!?]{2,}/g, '!')
    // Insert slight breathing pause after commas and semicolons
    .replace(/,\s*/g, ', ')
    // Emphasize question intonation by ensuring a clean question mark
    .replace(/\?\s*/g, '? ')
    .trim();
}

/**
 * Generate expressive speech via Python edge-tts bridge (supports full prosody and pitch adjustments).
 */
async function generateViaPythonBridge(
  text: string,
  voice: string,
  rate: string,
  pitch: string,
): Promise<Buffer | null> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'tts_engine.py');
  if (!fs.existsSync(scriptPath)) return null;

  const tmpOut = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

  return new Promise<Buffer | null>((resolve) => {
    const proc = spawn('python', [scriptPath, voice, tmpOut, rate, pitch], {
      windowsHide: true,
    });

    proc.stdin.write(text, 'utf8');
    proc.stdin.end();

    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {}
      resolve(null);
    }, 15000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(tmpOut)) {
        try {
          const buf = fs.readFileSync(tmpOut);
          fs.unlinkSync(tmpOut);
          resolve(buf);
          return;
        } catch {
          resolve(null);
          return;
        }
      }
      resolve(null);
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

/**
 * Fallback to Node.js EdgeTTS client.
 */
async function generateViaNodeEdgeTTS(text: string, voice: string, rate: string, pitch: string): Promise<Buffer> {
  const tts = new EdgeTTS();
  await tts.synthesize(text, voice, {
    rate: rate !== 'default' ? rate : '-4%',
    pitch: pitch !== 'default' ? pitch : '+0Hz',
  });
  return tts.toBuffer();
}

const ttsQuerySchema = z.object({
  text: z.string().min(1).max(1000),
  voice: z.string().default('en-US-JennyNeural'),
  rate: z.string().default('-4%'),
  pitch: z.string().default('+0Hz'),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // If requesting voices list
  if (searchParams.get('list') === 'true') {
    return NextResponse.json({ voices: POPULAR_NEURAL_VOICES });
  }

  const rawText = searchParams.get('text') ?? '';

  // Normalize rate (URL query decodes '+' to ' ' space, which breaks EdgeTTS SSML)
  let rawRate = (searchParams.get('rate') ?? '-4%').trim();
  if (rawRate && !rawRate.startsWith('+') && !rawRate.startsWith('-')) {
    rawRate = `+${rawRate}`;
  }

  // Normalize pitch
  let rawPitch = (searchParams.get('pitch') ?? '+0Hz').trim();
  if (rawPitch && !rawPitch.startsWith('+') && !rawPitch.startsWith('-')) {
    rawPitch = `+${rawPitch}`;
  }

  const parsed = ttsQuerySchema.safeParse({
    text: rawText,
    voice: searchParams.get('voice') ?? 'en-US-JennyNeural',
    rate: rawRate || '-4%',
    pitch: rawPitch || '+0Hz',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
  }

  const { text, voice, rate, pitch } = parsed.data;
  const processedText = humanizeSpokenText(text);

  const createAudioStreamResponse = (buf: Buffer) => {
    const rangeHeader = req.headers.get('range');
    const totalLength = buf.length;

    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (start >= totalLength || end >= totalLength || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalLength}`,
          },
        });
      }

      const chunk = buf.subarray(start, end + 1);
      const uint8 = new Uint8Array(chunk);

      return new Response(uint8, {
        status: 206,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Range': `bytes ${start}-${end}/${totalLength}`,
          'Content-Length': uint8.byteLength.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    const uint8 = new Uint8Array(buf);
    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  };

  const cacheKey = `${voice}:${rate}:${pitch}:${processedText}`;
  if (ttsAudioCache.has(cacheKey)) {
    const cachedBuf = ttsAudioCache.get(cacheKey)!;
    return createAudioStreamResponse(cachedBuf);
  }

  try {
    // 1. Try Python EdgeTTS bridge for finest prosody
    let buffer = await generateViaPythonBridge(processedText, voice, rate, pitch);

    // 2. Fallback to Node.js EdgeTTS if Python bridge is unavailable
    if (!buffer || buffer.length === 0) {
      buffer = await generateViaNodeEdgeTTS(processedText, voice, rate, pitch);
    }

    // Cache the synthesized audio (keep up to 100 items in memory)
    if (buffer && buffer.length > 0) {
      if (ttsAudioCache.size > 100) {
        const firstKey = ttsAudioCache.keys().next().value;
        if (firstKey) ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, buffer);
    }

    return createAudioStreamResponse(buffer);
  } catch (err) {
    console.error('[api/tts] Edge Neural TTS error:', err);
    return NextResponse.json(
      { error: 'Không thể tạo âm thanh AI lúc này. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
