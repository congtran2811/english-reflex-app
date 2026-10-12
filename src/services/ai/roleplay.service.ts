import 'server-only';
import { getServerEnv } from '@/lib/env';
import { fetchWithTimeout } from './shared';
import { resolveOllamaModel } from './ollama.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  category: string;
  icon: string;
  persona: string;
  context: string;
  openingLine: string;
  starterSuggestions: string[];
}

export const ROLEPLAY_SCENARIOS: ScenarioDefinition[] = [
  // 1. Công sở & Sự nghiệp
  {
    id: 'job-interview',
    title: 'Phỏng vấn xin việc (Tough Job Interview)',
    category: '💼 Sự nghiệp & Công sở',
    icon: '💼',
    persona: 'Mr. Harrison, a sharp and demanding senior hiring director at a tech company.',
    context: 'The user is interviewing for a key position. You want concise, confident, and professional answers. If their answer is vague or weak, push back politely with follow-up questions.',
    openingLine: "Good morning! Thanks for coming in today. To start off, why don't you briefly walk me through your background and tell me what specifically draws you to our company?",
    starterSuggestions: [
      'I have over 3 years of experience in software development...',
      'My passion lies in building scalable web products...',
      'I am really impressed by your team’s rapid innovation...',
    ],
  },
  {
    id: 'salary-negotiation',
    title: 'Đàm phán tăng lương (Salary Negotiation with Boss)',
    category: '💼 Sự nghiệp & Công sở',
    icon: '📈',
    persona: 'Ms. Clara, a pragmatic department director who values hard data and business ROI.',
    context: 'The user has worked at the company for 1.5 years with great performance and is asking for a 20% salary increase. You are open but want concrete evidence of their value.',
    openingLine: "Hi there! I saw you requested a quick one-on-one meeting today. What's on your mind?",
    starterSuggestions: [
      'Over the past year, I have consistently exceeded my quarterly targets...',
      'Based on my recent achievements and current market benchmarks...',
      'I would love to discuss adjusting my compensation to reflect my new responsibilities...',
    ],
  },
  {
    id: 'project-delay',
    title: 'Báo cáo trễ tiến độ dự án (Delivering Bad News to Client)',
    category: '💼 Sự nghiệp & Công sở',
    icon: '⏳',
    persona: 'Robert Sterling, an impatient corporate client awaiting an important product launch.',
    context: 'The user must inform you that the software release is postponed by 2 weeks due to critical security bugs. You are stressed and want immediate solutions.',
    openingLine: "Robert speaking. I'm reviewing our launch schedule for this Friday. Is everything 100% ready for deployment?",
    starterSuggestions: [
      'I am calling to give you an urgent update regarding our timeline...',
      'We uncovered unexpected security issues during the final audit...',
      'To guarantee complete data safety, we propose postponing the launch by two weeks...',
    ],
  },

  // 2. Du lịch & Sinh tồn ở nước ngoài
  {
    id: 'airport-customs',
    title: 'Hải quan sân bay thẩm vấn (Airport Immigration Check)',
    category: '✈️ Du lịch & Xuất ngoại',
    icon: '🛂',
    persona: 'Officer Miller, a stern US border patrol and customs officer at JFK Airport.',
    context: 'The user is entering the United States on a visitor visa. You check passports carefully, questioning their travel purpose, stay duration, and proof of funds.',
    openingLine: "Passport and landing card, please. What is the primary purpose of your trip to the United States?",
    starterSuggestions: [
      'I am visiting for two weeks for sightseeing and tourism...',
      'I plan to travel to New York and Boston before flying back...',
      'Here is my return ticket and hotel reservation confirmation...',
    ],
  },
  {
    id: 'hotel-complaint',
    title: 'Khiếu nại phòng khách sạn (Hotel Front Desk Dispute)',
    category: '✈️ Du lịch & Xuất ngoại',
    icon: '🏨',
    persona: 'David, a helpful but busy front desk manager at a 5-star hotel in London.',
    context: 'The user is an upset hotel guest. Their AC is broken, the room is noisy, and they requested a room upgrade or compensation.',
    openingLine: "Hello, sir/ma'am! Welcome to the front desk. How can I assist you today?",
    starterSuggestions: [
      'Excuse me, but the air conditioner in my room isn’t working at all...',
      'There is loud construction noise outside, and I’d like to change rooms...',
      'I was promised a quiet room with a city view...',
    ],
  },
  {
    id: 'lost-luggage',
    title: 'Mất hành lý tại sân bay (Lost Baggage Claim)',
    category: '✈️ Du lịch & Xuất ngoại',
    icon: '🧳',
    persona: 'Karen, an airline baggage claim customer service representative at Heathrow.',
    context: 'The user waited at the carousel for 45 minutes, but their suitcase never arrived. You need their claim tag and a detailed description of the bag.',
    openingLine: "Hello! Baggage service desk. Did your luggage fail to appear on the carousel?",
    starterSuggestions: [
      'Yes, I waited for an hour, but my black Samsonite suitcase never came out...',
      'Here is my baggage tag receipt from the check-in desk...',
      'I have urgent business clothing inside that I need for tomorrow morning...',
    ],
  },

  // 3. Đời sống & Giao tiếp thường ngày
  {
    id: 'market-bargaining',
    title: 'Mặc cả mua hàng ở chợ (Flea Market Bargaining)',
    category: '🛍️ Giao tiếp hàng ngày',
    icon: '🛍️',
    persona: 'Marco, an energetic, friendly vintage antique & leather jacket seller at a famous weekend market.',
    context: 'The user wants to buy an item and negotiate a better price. You love bargaining and teasing lightly, but you are open to a fair deal.',
    openingLine: "Hey there, friend! That jacket is genuine Italian leather—one of a kind! You've got great taste. I can let it go for $120 right now. What do you think?",
    starterSuggestions: [
      'That’s a bit out of my budget. Could you do $80?',
      'If I buy two items, what is your best price?',
      'It looks great, but $120 is too steep for me...',
    ],
  },
  {
    id: 'restaurant-ordering',
    title: 'Gọi món & Dị ứng ở nhà hàng Tây (Fine Dining Dilemma)',
    category: '🛍️ Giao tiếp hàng ngày',
    icon: '🍽️',
    persona: 'Julian, an attentive French waiter at an upscale bistro in New York.',
    context: 'The user has strict dietary preferences or peanut allergies, and wants recommendations from the chef’s specials.',
    openingLine: "Bonsoir! Welcome to Le Bistro. Here are our specials for tonight. Would you like to start with some wine or an appetizer, or do you have any dietary restrictions I should note for the chef?",
    starterSuggestions: [
      'Could you recommend a light appetizer that is nut-free?',
      'I have a severe peanut allergy. Is the sauce safe for me?',
      'What is today’s chef special recommendation?',
    ],
  },
  {
    id: 'noisy-neighbor',
    title: 'Phàn nàn hàng xóm ồn ào (Noisy Neighbor Confrontation)',
    category: '🛍️ Giao tiếp hàng ngày',
    icon: '🔊',
    persona: 'Tyler, a college student who loves blasting electronic music late at night in an apartment complex.',
    context: 'It is 1:30 AM on a Tuesday. The user knocks on your apartment door because the bass is shaking their walls.',
    openingLine: "Who is it? *opens door* Oh, hey neighbor! What's going on?",
    starterSuggestions: [
      'Sorry to bother you so late, but the music volume is shaking my walls...',
      'I have an important client presentation early tomorrow morning...',
      'Could you please turn down the bass and keep it down for the night?',
    ],
  },

  // 4. Tranh biện & Tư duy xã hội
  {
    id: 'tech-debate',
    title: 'Tranh luận công nghệ (AI & Human Jobs Debate)',
    category: '🧠 Tranh biện & Xã hội',
    icon: '🤖',
    persona: 'Dr. Sarah Vance, a passionate tech philosopher and AI futurist.',
    context: 'You are debating with the user whether AI will replace most intellectual human jobs or create more opportunities. You argue provocatively with compelling points.',
    openingLine: "In my view, AI isn't just an assistant; within a decade, it will outperform humans in most cognitive professions. Don't you think human workers are in serious trouble?",
    starterSuggestions: [
      'I believe AI is just a tool to enhance human productivity...',
      'History shows that technology always creates more jobs than it destroys...',
      'Certain human traits like true empathy and ethics cannot be automated...',
    ],
  },
  {
    id: 'remote-work-debate',
    title: 'Làm việc từ xa vs Đến văn phòng (Remote Work Debate)',
    category: '🧠 Tranh biện & Xã hội',
    icon: '💻',
    persona: 'Marcus Vance, a traditional corporate executive who believes in-office presence is mandatory for company culture.',
    context: 'The user is arguing that remote work is more productive and improves mental health. You argue that remote workers lose team cohesion and creativity.',
    openingLine: "Remote work might feel convenient, but it destroys real mentorship, team cohesion, and spontaneous innovation. Isn't working from home ultimately detrimental to career growth?",
    starterSuggestions: [
      'Studies show that employees without daily commutes are significantly more productive...',
      'Modern collaboration tools allow teams to communicate seamlessly across borders...',
      'What matters most is actual output and results, not hours spent in a physical chair...',
    ],
  },
  {
    id: 'social-media-ban',
    title: 'Có nên cấm mạng xã hội dưới 16 tuổi? (Youth Social Media Ban)',
    category: '🧠 Tranh biện & Xã hội',
    icon: '📱',
    persona: 'Elena Rostova, a child psychologist advocating for strict government restrictions on algorithmic feeds.',
    context: 'You believe addictive algorithms harm adolescent attention spans and mental health, and should be legally restricted under age 16.',
    openingLine: "Social media algorithms are engineered to exploit adolescent dopamine loops, fueling anxiety and depression. Shouldn't we legally ban social media for anyone under sixteen?",
    starterSuggestions: [
      'Rather than an outright ban, digital literacy and parental guidance are more effective...',
      'Enforcing strict age verification creates serious digital privacy concerns...',
      'I completely agree that algorithmic feeds designed for addiction must be regulated...',
    ],
  },
];

/**
 * Generate a brand new custom scenario using AI based on user topic or random prompt.
 */
export async function generateCustomScenario(topicDescription?: string): Promise<ScenarioDefinition> {
  const env = getServerEnv();

  const isRandom = !topicDescription || topicDescription.trim().length === 0;

  const prompt = isRandom
    ? `You are a creative English roleplay scenario designer.
Invent a unique, realistic, and dramatic English speaking practice scenario from everyday life, business, travel, or negotiation.
Output STRICT JSON format:
{
  "title": "Short catchy title in Vietnamese (English title in parentheses)",
  "category": "Category name with 1 emoji (e.g. 💼 Công sở & Kinh doanh, ✈️ Du lịch, 🗣️ Đời sống, ⚖️ Tranh biện)",
  "icon": "A single appropriate emoji",
  "persona": "Detailed persona of the AI partner (e.g. Officer Jack, an impatient customs inspector...)",
  "context": "Context for the dialogue in English explaining the tension or objective",
  "opening_line": "The opening greeting / question in 100% natural conversational English that the AI speaks first",
  "starter_suggestions": [
    "Suggested user reply starter 1 in English...",
    "Suggested user reply starter 2 in English...",
    "Suggested user reply starter 3 in English..."
  ]
}`
    : `You are an expert English roleplay scenario designer.
The user wants to practice English for this specific topic/situation:
"${topicDescription.trim()}"

Create an immersive, realistic, conversational English roleplay scenario based on this situation.
The AI partner should have a distinct personality (can be demanding, friendly, formal, or challenging).

Output STRICT JSON format:
{
  "title": "Short catchy title in Vietnamese (English title in parentheses)",
  "category": "Category name with 1 emoji",
  "icon": "A single appropriate emoji",
  "persona": "Detailed persona of the AI partner in English",
  "context": "Context for the dialogue in English explaining the user's objective and tension",
  "opening_line": "The opening greeting / question in 100% natural conversational English that the AI speaks first",
  "starter_suggestions": [
    "Suggested user reply starter 1 in English...",
    "Suggested user reply starter 2 in English...",
    "Suggested user reply starter 3 in English..."
  ]
}`;

  let rawOutput = '';

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
          options: { temperature: 0.8 },
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
          temperature: 0.8,
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
          generationConfig: { temperature: 0.8, responseMimeType: 'application/json' },
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
          temperature: 0.8,
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
      console.warn(`[generateCustomScenario:${p.name}]`, e);
    }
  }

  if (rawOutput) {
    try {
      const match = rawOutput.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const stamp = Date.now().toString(36);
        return {
          id: `custom-${stamp}`,
          title: parsed.title || topicDescription || 'Tình huống tùy chỉnh (Custom Scenario)',
          category: parsed.category || '✨ Tùy biến theo bạn',
          icon: parsed.icon || '🎭',
          persona: parsed.persona || 'A conversational English partner',
          context: parsed.context || `Roleplaying about: ${topicDescription}`,
          openingLine: parsed.opening_line || "Hello! I'm ready. What would you like to discuss today?",
          starterSuggestions: Array.isArray(parsed.starter_suggestions) ? parsed.starter_suggestions.slice(0, 3) : [],
        };
      }
    } catch (err) {
      console.error('[generateCustomScenario] Failed to parse JSON:', err);
    }
  }

  // Fallback random default scenario
  const stamp = Date.now().toString(36);
  return {
    id: `custom-${stamp}`,
    title: topicDescription ? `${topicDescription} (Custom Simulation)` : 'Gặp gỡ bất ngờ tại quán cafe (Cafe Encounter)',
    category: '✨ Tùy biến theo bạn',
    icon: '☕',
    persona: 'Alex, a friendly local digital nomad sitting at the next table in a bustling cafe.',
    context: 'You strike up a natural conversation about your projects and international travel.',
    openingLine: "Excuse me! I couldn't help noticing your laptop sticker. Are you working on tech projects too?",
    starterSuggestions: [
      'Yes, I work in software development! Are you in tech as well?',
      'That’s right, I’m working remotely while traveling...',
      'Haha, yes! I love collecting tech stickers from different conferences...',
    ],
  };
}

export async function chatRoleplayTurn(
  scenarioId: string,
  history: ChatMessage[],
  userSpeech: string,
  customScenario?: ScenarioDefinition,
): Promise<{
  replyText: string;
  quickFeedback: {
    naturalExpression?: string;
    grammarNote?: string;
  };
}> {
  const scenario =
    customScenario ||
    ROLEPLAY_SCENARIOS.find((s) => s.id === scenarioId) ||
    ROLEPLAY_SCENARIOS[0];

  const systemPrompt = `You are roleplaying as: "${scenario.persona}".
Scenario Context: ${scenario.context}

Rules for your roleplay:
1. Speak in natural, spoken English (1-3 sentences max). Keep it conversational, punchy, and realistic as if speaking on the phone or face-to-face.
2. Directly answer or react to what the user just said, and ask an engaging follow-up question or make a rebuttal to keep the conversation going.
3. In addition to your in-character reply, provide a brief "coaching note" in JSON:
   - "reply": What you say as the character in English.
   - "better_expression": If the user's sentence had awkward phrasing, show 1 natural native alternative. If their sentence was already good, leave null.
   - "grammar_note": Short 1-sentence tip in Vietnamese explaining any grammatical flaw or nuance, or null if fine.

Output STRICT JSON format:
{
  "reply": "Your in-character spoken English response here",
  "better_expression": "Native alternative or null",
  "grammar_note": "Tip in Vietnamese or null"
}`;

  const conversationHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const messagesToSend = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userSpeech },
  ];

  const env = getServerEnv();

  // Try providers in priority
  const tryOllama = async () => {
    if (!env.OLLAMA_BASE_URL) throw new Error('No Ollama URL');
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
          messages: messagesToSend,
          options: { temperature: 0.7 },
        }),
      },
      30000,
    );
    const data = await res.json();
    return data.message?.content ?? '';
  };

  const tryDeepSeek = async () => {
    if (!env.DEEPSEEK_API_KEY) throw new Error('No DeepSeek key');
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
          messages: messagesToSend,
        }),
      },
      25000,
    );
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  };

  const tryGemini = async () => {
    if (!env.GEMINI_API_KEY) throw new Error('No Gemini key');
    const promptPayload = `${systemPrompt}\n\nChat History:\n${history
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n')}\nUSER: ${userSpeech}\n\nRespond with strict JSON.`;

    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptPayload }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      },
      20000,
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  };

  const tryGroq = async () => {
    if (!env.GROQ_API_KEY) throw new Error('No Groq key');
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: messagesToSend,
        }),
      },
      20000,
    );
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  };

  const providers = [
    { name: 'ollama', run: tryOllama },
    { name: 'deepseek', run: tryDeepSeek },
    { name: 'gemini', run: tryGemini },
    { name: 'groq', run: tryGroq },
  ];

  const primaryName = env.AI_PRIMARY_PROVIDER;
  const ordered = [
    ...providers.filter((p) => p.name === primaryName),
    ...providers.filter((p) => p.name !== primaryName),
  ];

  let rawOutput = '';
  for (const p of ordered) {
    try {
      rawOutput = await p.run();
      if (rawOutput) break;
    } catch (e) {
      console.warn(`[chatRoleplayTurn:${p.name}]`, e);
    }
  }

  if (!rawOutput) {
    return {
      replyText: "That's an interesting point! Could you elaborate a bit more on what you mean?",
      quickFeedback: {},
    };
  }

  try {
    const match = rawOutput.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    return {
      replyText: parsed.reply || "I see. Let's explore that further. What else can you share?",
      quickFeedback: {
        naturalExpression: parsed.better_expression || undefined,
        grammarNote: parsed.grammar_note || undefined,
      },
    };
  } catch {
    return {
      replyText: rawOutput.slice(0, 200),
      quickFeedback: {},
    };
  }
}
