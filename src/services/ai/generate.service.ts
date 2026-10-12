import 'server-only';
import type { DifficultyLevel, PracticePrompt } from '@/types/practice';
import { getServerEnv } from '@/lib/env';
import { fetchWithTimeout } from './shared';

const TOPICS = [
  'du lịch và khám phá', 'ẩm thực và nấu ăn', 'công việc văn phòng và đồng nghiệp', 'phỏng vấn xin việc',
  'sức khỏe và lối sống lành mạnh', 'thể thao và rèn luyện', 'mua sắm và săn giảm giá', 'gia đình và người thân',
  'tình bạn và các mối quan hệ', 'hẹn hò và lãng mạn', 'công nghệ và AI', 'mạng xã hội và truyền thông',
  'giáo dục và kỹ năng mới', 'thời tiết và khí hậu', 'giao thông đô thị', 'nhà hàng và quán cà phê',
  'khách sạn và nghỉ dưỡng', 'sân bay và chuyến bay', 'bệnh viện và nhà thuốc', 'ngân hàng và đầu tư cá nhân',
  'môi trường sống', 'âm nhạc và hòa nhạc', 'phim ảnh và rạp chiếu', 'sách và thói quen đọc',
  'thú cưng và động vật', 'thuê căn hộ và chuyển nhà', 'lễ hội và phong tục', 'kinh doanh và bán hàng',
  'họp trực tuyến và thuyết trình', 'gửi email đối tác', 'khởi nghiệp và gọi vốn', 'lập trình và công nghệ thông tin',
  'tâm lý học và giải tỏa stress', 'thói quen buổi sáng', 'kỳ nghỉ cuối tuần', 'cảm xúc và sự đồng cảm',
  'khiếu nại dịch vụ khách hàng', 'xin lỗi và hòa giải', 'cho và nhận lời khuyên', 'tranh luận quan điểm',
  'kế hoạch 5 năm tới', 'sửa chữa đồ gia dụng', 'trải nghiệm ẩm thực đường phố', 'thuê xe tự lái',
];

const LEVEL_GUIDE: Record<DifficultyLevel, string> = {
  A1_A2: 'A1–A2: câu ngắn gọn 4–7 từ, thì hiện tại đơn/tiếp diễn, quá khứ đơn, từ vựng hằng ngày quen thuộc.',
  B1: 'B1: câu ngắn 6–9 từ, hiện tại hoàn thành, câu điều kiện đơn giản, modal verbs, văn nói tự nhiên.',
  B2: 'B2: câu cô đọng 8–11 từ, câu bị động, cụm động từ (phrasal verbs), thành ngữ thông dụng.',
  C1: 'C1: câu súc tích 9–12 từ (TUYỆT ĐỐI KHÔNG dài quá 12 từ), cấu trúc linh hoạt, tự nhiên chuẩn bản xứ.',
};

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function buildPrompt(
  level: DifficultyLevel,
  count: number,
  avoid: string[],
  topicPrompt?: string,
  isDialogueMode?: boolean,
): string {
  const chosenTopic = topicPrompt?.trim() || pick(TOPICS, 4).join(', ');
  const randomSalt = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (isDialogueMode) {
    return `Bạn là chuyên gia thiết kế bài tập giao tiếp tiếng Anh phản xạ đối thoại (Role-play Ping-Pong).
Tạo đúng ${count} tình huống đối thoại ngắn gọn, tự nhiên giữa Người bản xứ A và Học viên B.
Trình độ CEFR: ${LEVEL_GUIDE[level]}.
Chủ đề trọng tâm: ${chosenTopic}.

CẤU TRÚC JSON CHO MỖI CÂU:
- "english_prompt": Người bản xứ A hỏi hoặc mở lời ĐÚNG 1 CÂU ĐƠN NGẮN GỌN (5–10 từ tiếng Anh tự nhiên). TUYỆT ĐỐI KHÔNG dài dòng, không ghép 2 câu!
- "vietnamese_hint": Gợi ý câu TRẢ LỜI của B bằng tiếng Việt ngắn gọn (5–10 từ). TUYỆT ĐỐI KHÔNG dịch lại câu hỏi của A! ĐÂY LÀ Ý TRẢ LỜI / ĐÁP LẠI (TUYỆT ĐỐI KHÔNG CÓ DẤU CHẤM HỎI '?').
- "reference_english": Câu trả lời mẫu bằng tiếng Anh súc tích của B đáp lại A (5–10 từ). ĐÂY LÀ ĐÁP ÁN, TUYỆT ĐỐI KHÔNG ĐƯỢC LẶP LẠI CÂU HỎI CỦA A!

QUY TẮC BẮT BUỘC ĐỂ KHÔNG BỊ DÀI DÒNG VÀ KHÔNG BỊ TRÙNG LẶP:
1. ĐỘ DÀI: MỖI CÂU LÀ ĐÚNG 1 CÂU ĐƠN NGẮN GỌN (Single short sentence, 5–10 từ). TUYỆT ĐỐI KHÔNG nói lan man hay ghép nhiều vế câu.
2. KHÔNG tạo các câu hỏi sáo rỗng lặp lại như "Where are you from?", "What is your job?", "What do you do in your free time?".
3. Mỗi tình huống phải cụ thể, có ngữ cảnh thực tế phong phú.
4. "english_prompt" = Câu hỏi hoặc lời mở đầu của A (ngắn gọn 5–10 từ).
5. "vietnamese_hint" = Ý câu TRẢ LỜI của B (Tiếng Việt, 5–10 từ). KHÔNG ĐƯỢC LÀ CÂU HỎI.
6. "reference_english" = Câu trả lời của B (Tiếng Anh, 5–10 từ). KHÔNG được trùng với câu hỏi của A.
${avoid.length ? `7. TUYỆT ĐỐI KHÔNG ĐƯỢC LẶP LẠI bất kỳ ý nào sau đây:\n${avoid.slice(0, 50).map((s) => `- ${s}`).join('\n')}\n` : ''}
Unique Salt: ${randomSalt}
Chỉ xuất JSON thuần túy: {"items":[{"english_prompt":"...","vietnamese_hint":"...","reference_english":"..."}]}`;
  }

  return `Bạn là giáo viên tiếng Anh thiết kế bài tập phản xạ dịch Việt - Anh.
Tạo đúng ${count} câu tiếng Việt văn nói đời thường tự nhiên, ngắn gọn, súc tích để học viên luyện phản xạ nhanh.
Trình độ CEFR: ${LEVEL_GUIDE[level]}.
Chủ đề: ${chosenTopic}.
QUY TẮC ĐỘ DÀI BẮT BUỘC:
- MỖI CÂU PHẢI LÀ 1 CÂU ĐƠN NGẮN GỌN (chỉ từ 5–10 từ tiếng Việt và 5–10 từ tiếng Anh tương ứng).
- TUYỆT ĐỐI KHÔNG tạo câu dài dòng, không ghép nhiều mệnh đề phức tạp làm mất tính phản xạ tức thì.
${avoid.length ? `TUYỆT ĐỐI KHÔNG dùng lại các câu hoặc ý sau:\n${avoid.slice(0, 50).map((s) => `- ${s}`).join('\n')}\n` : ''}
Unique Salt: ${randomSalt}
Chỉ xuất JSON thuần túy: {"items":[{"vi":"...","en":"..."}]}`;
}

function parse(text: string, level: DifficultyLevel, isDialogueMode?: boolean): PracticePrompt[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in generator output');
  const data = JSON.parse(match[0]) as {
    items?: Array<{
      vi?: string;
      en?: string;
      question?: string;
      english_prompt?: string;
      vietnamese_hint?: string;
      reference_english?: string;
      answer?: string;
      response?: string;
      reply?: string;
    }>;
  };
  const stamp = Date.now().toString(36);
  const results: PracticePrompt[] = [];
  for (let idx = 0; idx < (data.items ?? []).length; idx++) {
    const i = data.items![idx];
    if (i.english_prompt || isDialogueMode) {
      const engPrompt = (i.english_prompt || i.question || '').trim();
      const viHint = (i.vietnamese_hint || i.vi || '').trim();
      const refEng = (
        i.reference_english ||
        (i.en && i.en.trim().toLowerCase() !== engPrompt.toLowerCase() ? i.en : '') ||
        i.answer ||
        i.response ||
        i.reply ||
        ''
      ).trim();
      const partnerQuestion = engPrompt;

      if (!partnerQuestion || !viHint || !refEng) {
        // Discard incomplete items - never inject static bank
        continue;
      }

      const qClean = partnerQuestion.toLowerCase().replace(/[^a-z0-9]/g, '');
      const refClean = refEng.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Discard items where LLM simply echoed the question
      const isCorrupted =
        qClean === refClean ||
        (refClean.length > 8 && qClean.includes(refClean)) ||
        (viHint.endsWith('?') && partnerQuestion.endsWith('?')) ||
        refEng.endsWith('?');

      if (isCorrupted) {
        // Discard corrupted item - DO NOT fall back to static bank!
        continue;
      }

      results.push({
        id: `ai-${stamp}-${idx}`,
        level,
        vietnamese: viHint,
        referenceTranslation: refEng,
        partnerQuestion,
      });
    } else if (i.vi?.trim() && i.en?.trim()) {
      results.push({
        id: `ai-${stamp}-${idx}`,
        level,
        vietnamese: i.vi.trim(),
        referenceTranslation: i.en.trim(),
        partnerQuestion: i.question?.trim() || undefined,
      });
    }
  }
  return results;
}

import { resolveOllamaModel } from './ollama.service';

async function viaOllama(prompt: string, baseUrl: string, model: string): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const resolvedModel = await resolveOllamaModel(cleanBase, model);
  const res = await fetchWithTimeout(
    `${cleanBase}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedModel,
        format: 'json',
        stream: false,
        messages: [{ role: 'user', content: prompt }],
        options: {
          temperature: 0.8,
        },
      }),
    },
    45000,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${data?.error ?? 'unknown'}`);
  return data.message?.content ?? '';
}

async function viaGemini(prompt: string, key: string, model: string): Promise<string> {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, responseMimeType: 'application/json' },
      }),
    },
    20000,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message ?? 'unknown'}`);
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

async function viaGroq(prompt: string, key: string, model: string): Promise<string> {
  const res = await fetchWithTimeout(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 1.0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    },
    20000,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Groq ${res.status}: ${data?.error?.message ?? 'unknown'}`);
  return data.choices?.[0]?.message?.content ?? '';
}

async function viaDeepSeek(prompt: string, key: string, baseUrl: string, model: string): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = cleanBase.endsWith('/v1') ? `${cleanBase}/chat/completions` : `${cleanBase}/chat/completions`;
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    },
    25000,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${data?.error?.message ?? 'unknown'}`);
  return data.choices?.[0]?.message?.content ?? '';
}

export async function generatePrompts(
  level: DifficultyLevel,
  count: number,
  avoid: string[] = [],
  topicPrompt?: string,
  isDialogueMode?: boolean,
): Promise<PracticePrompt[]> {
  const env = getServerEnv();
  // Request 2 extra items so that any filtered out items still leave enough prompts
  const requestedCount = Math.min(20, count + 2);
  const prompt = buildPrompt(level, requestedCount, avoid, topicPrompt, isDialogueMode);

  const ollama = env.OLLAMA_BASE_URL
    ? { name: 'ollama', run: () => viaOllama(prompt, env.OLLAMA_BASE_URL, env.OLLAMA_MODEL) }
    : null;
  const deepseek = env.DEEPSEEK_API_KEY
    ? { name: 'deepseek', run: () => viaDeepSeek(prompt, env.DEEPSEEK_API_KEY!, env.DEEPSEEK_BASE_URL, env.DEEPSEEK_MODEL) }
    : null;
  const gemini = env.GEMINI_API_KEY
    ? { name: 'gemini', run: () => viaGemini(prompt, env.GEMINI_API_KEY!, env.GEMINI_MODEL) }
    : null;
  const groq = env.GROQ_API_KEY
    ? { name: 'groq', run: () => viaGroq(prompt, env.GROQ_API_KEY!, env.GROQ_MODEL) }
    : null;

  const all = [ollama, deepseek, gemini, groq].filter((p): p is { name: string; run: () => Promise<string> } => Boolean(p));
  const primaryName = env.AI_PRIMARY_PROVIDER;
  const ordered = [
    ...all.filter((p) => p.name === primaryName),
    ...all.filter((p) => p.name !== primaryName),
  ];

  let lastErr: unknown = new Error('No AI provider configured');
  for (const provider of ordered) {
    try {
      const output = await provider.run();
      const items = parse(output, level, isDialogueMode);
      if (items.length) return items.slice(0, count);
    } catch (err) {
      lastErr = err;
      console.warn(`[generatePrompts:${provider.name}]`, err);
    }
  }
  throw lastErr;
}

