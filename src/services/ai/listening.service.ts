import 'server-only';
import { getServerEnv } from '@/lib/env';
import { fetchWithTimeout } from './shared';
import { resolveOllamaModel } from './ollama.service';

import type { ListeningItem, ListeningModeType, ListeningLevelInfo } from '@/types/listening';
import { LISTENING_LEVELS } from '@/types/listening';
export type { ListeningItem, ListeningModeType, ListeningLevelInfo };
export { LISTENING_LEVELS };

const LISTENING_LEVEL_PROMPT_GUIDE: Record<string, string> = {
  A1_A2: `Target Level: A1–A2 (Beginner).
Sentence Length: 4–7 words. (STRICT: Single short sentence, max 7 words).
Vocabulary: Everyday basic words, daily routines, clear pronunciation.
Examples: "Please turn off the lights.", "I wake up at seven.", "Can you pass the salt?"
Listening Focus: Basic consonant-to-vowel linking (e.g. "turn off", "an apple"). Keep grammar simple.`,
  B1: `Target Level: B1 (Intermediate).
Sentence Length: 6–9 words. (STRICT: Single short sentence, max 9 words).
Vocabulary: Conversational speed, travel, workplace, everyday requests.
Examples: "How do I get to the station?", "Could you reschedule our meeting tomorrow?", "Don't forget to check the itinerary."
Listening Focus: Weak forms of function words (e.g. "to", "for", "can", "at"), linking sounds (e.g. "get to", "looking for").`,
  B2: `Target Level: B2 (Upper-Intermediate).
Sentence Length: 8–11 words. (STRICT: Single short sentence, max 11 words).
Vocabulary: Natural native speed, professional context, idioms, phrasal verbs.
Examples: "Would you mind pushing back our quarterly review?", "We had to call off the outdoor conference.", "She has been managing the design team."
Listening Focus: Elision of /t/ and /d/ (e.g. "next door" -> /neks-door/), assimilation (e.g. "would you" -> /wʊdʒuː/), intrusive sounds.`,
  C1: `Target Level: C1 (Advanced).
Sentence Length: 9–12 words. (STRICT: Single crisp sentence, NEVER exceed 12 words!).
Vocabulary: Fluent native pace, concise academic or business collocations, nuanced expressions.
Examples: "We saw unprecedented volatility in the international commodities market.", "The board remained conspicuously reluctant to endorse the merger."
Listening Focus: Complex intonation patterns, rapid syllable compression, stress-timed rhythm.`,
};

const DEFAULT_ITEMS: Record<string, ListeningItem[]> = {
  A1_A2: [
    {
      id: 'l-a1-1',
      englishText: "Please remember to turn off the lights.",
      vietnameseMeaning: "Xin vui lòng nhớ tắt đèn nhé.",
      question: "What should you do with the lights?",
      keyPoints: ["turn off", "turn off lights"],
      blankTargetWord: "turn off",
      maskedSentence: "Please remember to [___] the lights.",
      soundExplanation: "Nối âm phụ âm với nguyên âm: 'turn off' nối thành /tɜːn-ɒf/ mượt mà.",
    },
    {
      id: 'l-a1-2',
      englishText: "I usually wake up at seven.",
      vietnameseMeaning: "Tôi thường thức dậy lúc 7 giờ.",
      question: "What time does the speaker wake up?",
      keyPoints: ["seven", "7 o'clock", "seven o'clock"],
      blankTargetWord: "wake up",
      maskedSentence: "I usually [___] at seven.",
      soundExplanation: "'wake up' nối âm thành /weɪ-kʌp/, 'at seven' lướt nhẹ âm /ət/.",
    },
    {
      id: 'l-a1-3',
      englishText: "Could you pass me an apple?",
      vietnameseMeaning: "Bạn có thể chuyền cho tôi một quả táo không?",
      question: "What item is the speaker asking for?",
      keyPoints: ["apple", "an apple"],
      blankTargetWord: "an apple",
      maskedSentence: "Could you pass me [___]?",
      soundExplanation: "'an apple' nối liền phụ âm /n/ với nguyên âm /æ/: /ə-næpl/.",
    },
    {
      id: 'l-a1-4',
      englishText: "She has to catch the bus soon.",
      vietnameseMeaning: "Cô ấy phải bắt xe buýt sớm thôi.",
      question: "What does she need to catch?",
      keyPoints: ["the bus", "bus"],
      blankTargetWord: "has to",
      maskedSentence: "She [___] catch the bus soon.",
      soundExplanation: "'has to' biến âm thành /hæs-tə/ nhanh chóng thay vì /hæz tuː/.",
    },
    {
      id: 'l-a1-5',
      englishText: "Let's eat at an Italian restaurant tonight.",
      vietnameseMeaning: "Tối nay chúng ta hãy đi ăn nhà hàng Ý nhé.",
      question: "What type of food do they want to eat?",
      keyPoints: ["Italian", "Italian restaurant"],
      blankTargetWord: "Italian",
      maskedSentence: "Let's eat at an [___] restaurant tonight.",
      soundExplanation: "'at an' nối liền âm /æt-ən/ rất nhanh trong văn nói.",
    },
  ],
  B1: [
    {
      id: 'l-b1-1',
      englishText: "How do I get to the station?",
      vietnameseMeaning: "Làm sao để tôi đến được nhà ga?",
      question: "Where does the speaker want to go?",
      keyPoints: ["station", "the station"],
      blankTargetWord: "get to",
      maskedSentence: "How do I [___] the station?",
      soundExplanation: "Nối âm 'get to' được nói lướt thành /get-tə/ nhanh chóng.",
    },
    {
      id: 'l-b1-2',
      englishText: "The conference has been rescheduled until next Wednesday.",
      vietnameseMeaning: "Hội nghị đã được dời lịch sang thứ Tư tuần sau.",
      question: "When has the conference been moved to?",
      keyPoints: ["next Wednesday", "Wednesday"],
      blankTargetWord: "rescheduled",
      maskedSentence: "The conference has been [___] until next Wednesday.",
      soundExplanation: "Âm /d/ ở đuôi 'rescheduled' nối nhẹ với 'until' thành /rescheduled-until/.",
    },
    {
      id: 'l-b1-3',
      englishText: "Please double-check the flight itinerary before booking.",
      vietnameseMeaning: "Vui lòng kiểm tra lại lịch trình chuyến bay trước khi đặt nhé.",
      question: "What should be checked before booking?",
      keyPoints: ["flight itinerary", "itinerary"],
      blankTargetWord: "itinerary",
      maskedSentence: "Please double-check the flight [___] before booking.",
      soundExplanation: "'double-check the' được nói dính liền: /double-check-thə/.",
    },
    {
      id: 'l-b1-4',
      englishText: "We decided to postpone the outdoor picnic.",
      vietnameseMeaning: "Chúng tôi đã quyết định hoãn buổi dã ngoại ngoài trời.",
      question: "What was postponed?",
      keyPoints: ["outdoor picnic", "picnic"],
      blankTargetWord: "postpone",
      maskedSentence: "We decided to [___] the outdoor picnic.",
      soundExplanation: "Âm 't' trong 'postpone' thường bị nuốt nhẹ: /pos-pone/.",
    },
    {
      id: 'l-b1-5',
      englishText: "She works as a product designer here.",
      vietnameseMeaning: "Cô ấy làm việc với vai trò thiết kế sản phẩm ở đây.",
      question: "What is her job title?",
      keyPoints: ["product designer", "designer"],
      blankTargetWord: "as a",
      maskedSentence: "She works [___] product designer here.",
      soundExplanation: "'as a' nối âm thành /æ-zə/ mượt mà.",
    },
  ],
  B2: [
    {
      id: 'l-b2-1',
      englishText: "Would you mind pushing back our quarterly review?",
      vietnameseMeaning: "Bạn có phiền nếu chúng ta dời cuộc họp đánh giá quý lại không?",
      question: "What meeting is proposed to be pushed back?",
      keyPoints: ["quarterly review", "review meeting"],
      blankTargetWord: "pushing back",
      maskedSentence: "Would you mind [___] our quarterly review?",
      soundExplanation: "Âm /dʒ/ trong 'mind pushing' nối tự nhiên, 'pushing back' nuốt âm g.",
    },
    {
      id: 'l-b2-2',
      englishText: "The team had to call off the launch event.",
      vietnameseMeaning: "Nhóm đã phải hủy bỏ sự kiện ra mắt.",
      question: "What did the team do to the launch event?",
      keyPoints: ["call off", "cancel", "called off"],
      blankTargetWord: "call off",
      maskedSentence: "The team had to [___] the launch event.",
      soundExplanation: "'call off' nối phụ âm /l/ với nguyên âm /ɒ/: /kɔːl-ɒf/.",
    },
    {
      id: 'l-b2-3',
      englishText: "He managed to finish the assignment ahead of schedule.",
      vietnameseMeaning: "Anh ấy đã hoàn thành bài tập sớm hơn dự kiến.",
      question: "When did he finish the assignment?",
      keyPoints: ["ahead of schedule", "early"],
      blankTargetWord: "ahead of",
      maskedSentence: "He managed to finish the assignment [___] schedule.",
      soundExplanation: "'ahead of' nối âm thành /ə-hed-əv/ lướt nhanh.",
    },
    {
      id: 'l-b2-4',
      englishText: "We need to come up with a better solution.",
      vietnameseMeaning: "Chúng ta cần nghĩ ra một giải pháp tốt hơn.",
      question: "What does the speaker say they need to find?",
      keyPoints: ["better solution", "a solution"],
      blankTargetWord: "come up with",
      maskedSentence: "We need to [___] a better solution.",
      soundExplanation: "'come up with' nói dính liền thành một cụm duy nhất /kʌm-ʌp-wɪð/.",
    },
    {
      id: 'l-b2-5',
      englishText: "She has been handling customer inquiries all morning.",
      vietnameseMeaning: "Cô ấy đã xử lý các thắc mắc của khách hàng suốt cả buổi sáng.",
      question: "Who was she helping all morning?",
      keyPoints: ["customers", "customer inquiries"],
      blankTargetWord: "handling",
      maskedSentence: "She has been [___] customer inquiries all morning.",
      soundExplanation: "'has been' giảm âm thành /həz-bɪn/, 'all morning' nhấn trọng âm.",
    },
  ],
  C1: [
    {
      id: 'l-c1-1',
      englishText: "We saw unprecedented volatility in the international commodities market.",
      vietnameseMeaning: "Chúng tôi đã chứng kiến sự biến động chưa từng có trên thị trường hàng hóa quốc tế.",
      question: "What happened in the commodities market?",
      keyPoints: ["unprecedented volatility", "volatility"],
      blankTargetWord: "volatility",
      maskedSentence: "We saw unprecedented [___] in the international commodities market.",
      soundExplanation: "Đọc nhịp điệu trọng âm dồn /ˌvɒl.əˈtɪl.ə.ti/ với ngữ điệu học thuật.",
    },
    {
      id: 'l-c1-2',
      englishText: "The board remained conspicuously reluctant to endorse the proposed merger.",
      vietnameseMeaning: "Hội đồng quản trị tỏ ra ngần ngại rõ rệt trong việc thông qua vụ sáp nhập.",
      question: "How did the board feel about endorsing the merger?",
      keyPoints: ["reluctant", "conspicuously reluctant"],
      blankTargetWord: "reluctant",
      maskedSentence: "The board remained conspicuously [___] to endorse the proposed merger.",
      soundExplanation: "Âm /t/ trong 'reluctant to' bị triệt tiêu thành âm tắc thanh hầu (glottal stop).",
    },
    {
      id: 'l-c1-3',
      englishText: "Had regulators intervened sooner, the collapse might have been averted.",
      vietnameseMeaning: "Nếu các nhà quản lý can thiệp sớm hơn, sự sụp đổ có lẽ đã được ngăn chặn.",
      question: "What could have averted the collapse?",
      keyPoints: ["intervened sooner", "regulators intervened"],
      blankTargetWord: "intervened",
      maskedSentence: "Had regulators [___] sooner, the collapse might have been averted.",
      soundExplanation: "'might have been' được nói lướt dồn dập thành /maɪt-əv-bɪn/ trong văn nói bản xứ.",
    },
    {
      id: 'l-c1-4',
      englishText: "Her keynote address eloquently dismantled prevailing artificial intelligence misconceptions.",
      vietnameseMeaning: "Bài phát biểu của cô ấy đã bác bỏ thuyết phục những hiểu lầm phổ biến về AI.",
      question: "What was the keynote address about?",
      keyPoints: ["artificial intelligence", "AI misconceptions"],
      blankTargetWord: "dismantled",
      maskedSentence: "Her keynote address eloquently [___] prevailing artificial intelligence misconceptions.",
      soundExplanation: "'eloquently dismantled' lướt âm phụ âm kép, nhấn mạnh trọng âm vào âm tiết đầu.",
    },
    {
      id: 'l-c1-5',
      englishText: "The discrepancy in forecasts prompted substantial skepticism among analysts.",
      vietnameseMeaning: "Sự chênh lệch trong các dự báo đã dấy lên sự hoài nghi đáng kể trong giới phân tích.",
      question: "What caused skepticism among analysts?",
      keyPoints: ["discrepancy", "discrepancy in forecasts"],
      blankTargetWord: "discrepancy",
      maskedSentence: "The [___] in forecasts prompted substantial skepticism among analysts.",
      soundExplanation: "Nhịp điệu dồn dập với chuỗi âm đa tiết: /dɪˈskrep-ən-si/.",
    },
  ],
};

const LISTENING_TOPICS = [
  'everyday conversation & chatting with coworkers',
  'airport check-in, delays & flight announcements',
  'hotel booking, room service & concierge requests',
  'ordering food, dietary preferences & asking about ingredients',
  'office meetings, project deadlines & team brainstorms',
  'job interview questions & career milestones',
  'shopping in stores, asking for discounts & return policies',
  'medical clinic appointments, doctor advice & pharmacies',
  'public transportation, subway transfers & asking for directions',
  'technology devices, software updates & technical troubleshooting',
  'weekend plans, outdoor hiking, hobbies & entertainment',
  'weather emergencies, travel forecasts & seasonal activities',
];

export async function generateListeningSession(
  level: string = 'B1',
  topic?: string,
): Promise<ListeningItem[]> {
  const env = getServerEnv();
  const normalizedLevel = (level || 'B1').toUpperCase().replace('-', '_');
  const levelPrompt = LISTENING_LEVEL_PROMPT_GUIDE[normalizedLevel] || LISTENING_LEVEL_PROMPT_GUIDE.B1;

  const chosenTopic = topic?.trim() || LISTENING_TOPICS[Math.floor(Math.random() * LISTENING_TOPICS.length)];
  const randomSalt = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const prompt = `You are an expert English listening test designer.
Generate 5 diverse, highly natural spoken English sentences for CEFR Level: ${normalizedLevel}.
Topic: ${chosenTopic}.
Random Salt: ${randomSalt}

${levelPrompt}

CRITICAL RULES:
1. MỖI ĐỀ BÀI LÀ ĐÚNG 1 CÂU ĐƠN NGẮN GỌN (EXACTLY 1 SHORT SENTENCE).
2. TUYỆT ĐỐI KHÔNG ghép 2 câu, không dùng dấu chấm giữa câu, không tạo câu kép dài dòng gây quá tải cho người nghe.
3. TUYỆT ĐỐI tuân thủ độ dài từ:
   - A1_A2: 4–7 từ
   - B1: 6–9 từ
   - B2: 8–11 từ
   - C1: 9–12 từ (TUYỆT ĐỐI KHÔNG VƯỢT QUÁ 12 TỪ!)
4. Every sentence MUST be conversational, modern, and distinct (no textbook clichés).
5. For EACH item, provide:
- "english_text": EXACTLY 1 natural spoken English sentence tailored to level ${normalizedLevel}.
- "vietnamese_meaning": Accurate Vietnamese translation.
- "question": 1 quick comprehension question about the core fact or key detail.
- "key_points": Array of 2-3 essential keyword strings or phrases answering the question.
- "blank_target_word": 1-2 tricky words testing connected speech / weak forms at this level.
- "masked_sentence": Same sentence with [___] replacing "blank_target_word".
- "sound_explanation": Short tip in Vietnamese explaining the linking sound (nối âm), weak form (giảm âm), or stress in that phrase.

Output STRICT JSON format:
{"items": [
  {
    "english_text": "...",
    "vietnamese_meaning": "...",
    "question": "...",
    "key_points": ["..."],
    "blank_target_word": "...",
    "masked_sentence": "...",
    "sound_explanation": "..."
  }
]}`;

  let rawOutput = '';

  // Providers with failover ordered by AI_PRIMARY_PROVIDER
  const tryOllama = async () => {
    if (!env.OLLAMA_BASE_URL) return '';
    const cleanBase = env.OLLAMA_BASE_URL.replace(/\/+$/, '');
    const model = await resolveOllamaModel(cleanBase, env.OLLAMA_MODEL);
    const res = await fetchWithTimeout(
      `${cleanBase}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          format: 'json',
          stream: false,
          messages: [{ role: 'user', content: prompt }],
          options: { temperature: 0.7 },
        }),
      },
      25000,
    );
    const data = await res.json();
    return data.message?.content ?? '';
  };

  const tryDeepSeek = async () => {
    if (!env.DEEPSEEK_API_KEY) return '';
    const cleanBase = env.DEEPSEEK_BASE_URL.replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/v1') ? `${cleanBase}/chat/completions` : `${cleanBase}/chat/completions`;
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: env.DEEPSEEK_MODEL || 'deepseek-chat',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      },
      25000,
    );
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  };

  const tryGemini = async () => {
    if (!env.GEMINI_API_KEY) return '';
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      },
      20000,
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  };

  const tryGroq = async () => {
    if (!env.GROQ_API_KEY) return '';
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
        }),
      },
      20000,
    );
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  };

  const providers = [
    { name: 'ollama', run: tryOllama, enabled: Boolean(env.OLLAMA_BASE_URL) },
    { name: 'deepseek', run: tryDeepSeek, enabled: Boolean(env.DEEPSEEK_API_KEY) },
    { name: 'gemini', run: tryGemini, enabled: Boolean(env.GEMINI_API_KEY) },
    { name: 'groq', run: tryGroq, enabled: Boolean(env.GROQ_API_KEY) },
  ].filter((p) => p.enabled);

  const primaryName = env.AI_PRIMARY_PROVIDER;
  const ordered = [
    ...providers.filter((p) => p.name === primaryName),
    ...providers.filter((p) => p.name !== primaryName),
  ];

  for (const p of ordered) {
    try {
      rawOutput = await p.run();
      if (rawOutput) break;
    } catch (e) {
      console.warn(`[generateListeningSession:${p.name}]`, e);
    }
  }

/**
 * Guarantees that maskedSentence and blankTargetWord strictly match the missing gap in englishText.
 * Fixes LLM hallucinations where the prompt masks one word but returns a completely different target word.
 */
function synchronizeGapFill(englishText: string, rawTarget?: string, rawMasked?: string): {
  targetWord: string;
  maskedSentence: string;
} {
  const cleanEnglish = englishText.trim();
  const blankRegex = /\[___\]|___+|\[\.\.\.\]|\(\.\.\.\)/;

  // 1. If rawMasked contains a blank marker, deduce the exact missing substring from englishText
  if (rawMasked && blankRegex.test(rawMasked)) {
    const parts = rawMasked.split(blankRegex);
    const prefix = parts[0]?.trim() || '';
    const suffix = parts[1]?.trim() || '';

    let startAfterPrefix = 0;
    if (prefix) {
      const pIdx = cleanEnglish.toLowerCase().indexOf(prefix.toLowerCase());
      if (pIdx !== -1) {
        startAfterPrefix = pIdx + prefix.length;
      }
    }

    let endBeforeSuffix = cleanEnglish.length;
    if (suffix) {
      const sIdx = cleanEnglish.toLowerCase().lastIndexOf(suffix.toLowerCase());
      if (sIdx > startAfterPrefix) {
        endBeforeSuffix = sIdx;
      }
    }

    const extractedGap = cleanEnglish.slice(startAfterPrefix, endBeforeSuffix).trim().replace(/^[.,!?;:]+|[.,!?;:]+$/g, '');
    if (extractedGap && extractedGap.length > 0 && extractedGap.length < cleanEnglish.length) {
      return {
        targetWord: extractedGap,
        maskedSentence: `${cleanEnglish.slice(0, startAfterPrefix)}[___]${cleanEnglish.slice(endBeforeSuffix)}`.trim(),
      };
    }
  }

  // 2. If rawTarget is provided and exists in englishText, build maskedSentence reliably
  if (rawTarget && rawTarget.trim()) {
    const cleanTarget = rawTarget.trim().replace(/^[.,!?;:]+|[.,!?;:]+$/g, '');
    const targetIdx = cleanEnglish.toLowerCase().indexOf(cleanTarget.toLowerCase());
    if (targetIdx !== -1) {
      const actualWordInText = cleanEnglish.slice(targetIdx, targetIdx + cleanTarget.length);
      const masked = `${cleanEnglish.slice(0, targetIdx)}[___]${cleanEnglish.slice(targetIdx + cleanTarget.length)}`;
      return {
        targetWord: actualWordInText,
        maskedSentence: masked,
      };
    }
  }

  // 3. Fallback: select a content word in the middle of the sentence
  const words = cleanEnglish.split(/\s+/);
  const targetIdx = words.length > 2 ? Math.min(2, words.length - 2) : 0;
  const rawPick = words[targetIdx] || words[0] || 'word';
  const targetWord = rawPick.replace(/^[.,!?;:]+|[.,!?;:]+$/g, '');
  const charIdx = cleanEnglish.indexOf(targetWord);
  const maskedSentence = charIdx !== -1
    ? `${cleanEnglish.slice(0, charIdx)}[___]${cleanEnglish.slice(charIdx + targetWord.length)}`
    : `${cleanEnglish} [___]`;

  return { targetWord, maskedSentence };
}

  if (rawOutput) {
    try {
      const match = rawOutput.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const stamp = Date.now().toString(36);
          return parsed.items.map((item: Record<string, unknown>, idx: number) => {
            const englishText = String(item.english_text || '').trim();
            const { targetWord, maskedSentence } = synchronizeGapFill(
              englishText,
              item.blank_target_word ? String(item.blank_target_word) : undefined,
              item.masked_sentence ? String(item.masked_sentence) : undefined,
            );

            return {
              id: `listen-${stamp}-${idx}`,
              englishText,
              vietnameseMeaning: String(item.vietnamese_meaning || '').trim(),
              question: item.question ? String(item.question).trim() : undefined,
              keyPoints: Array.isArray(item.key_points) ? item.key_points.map(String) : [],
              blankTargetWord: targetWord,
              maskedSentence: maskedSentence,
              soundExplanation: item.sound_explanation ? String(item.sound_explanation).trim() : undefined,
            };
          });
        }
      }
    } catch (err) {
      console.error('[generateListeningSession] parse error:', err);
    }
  }

  // Fallback defaults
  return DEFAULT_ITEMS[normalizedLevel] || DEFAULT_ITEMS.B1;
}
