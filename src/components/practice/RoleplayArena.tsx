'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  ChevronRight,
  Flame,
  Dices,
  PlusCircle,
  Search,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import type { ScenarioDefinition } from '@/services/ai/roleplay.service';
import { TypingIndicator } from '@/components/common/LoadingStates';

interface MessageItem {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  latency?: number | null;
  betterExpression?: string;
  grammarNote?: string;
}

const CATEGORIES = [
  'Tất cả',
  '💼 Sự nghiệp & Công sở',
  '✈️ Du lịch & Xuất ngoại',
  '🛍️ Giao tiếp hàng ngày',
  '🧠 Tranh biện & Xã hội',
];

export function RoleplayArena() {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDefinition | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [autoSpeakAi, setAutoSpeakAi] = useState(true);
  const [inputMode, setInputMode] = useState<'voice' | 'keyboard'>('voice');
  const [keyboardText, setKeyboardText] = useState('');

  // Filtering & Custom Scenario state
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  // Load scenarios on mount
  useEffect(() => {
    fetch('/api/roleplay/chat')
      .then((res) => res.json())
      .then((data) => {
        if (data.scenarios) setScenarios(data.scenarios);
      })
      .catch(console.error);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // When scenario is selected, initialize the chat with the opening line
  const handleSelectScenario = (sc: ScenarioDefinition) => {
    setSelectedScenario(sc);
    const initialMsg: MessageItem = {
      id: `ai-init-${Date.now()}`,
      role: 'assistant',
      text: sc.openingLine,
    };
    setMessages([initialMsg]);

    // Speak opening line
    if (autoSpeakAi) {
      setTimeout(() => {
        tts.speak(sc.openingLine);
      }, 400);
    }
  };

  // Generate Custom Scenario by User Topic or Random
  const handleGenerateCustomScenario = async (topic?: string) => {
    setIsGeneratingCustom(true);
    try {
      const res = await fetch('/api/roleplay/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicDescription: topic || '' }),
      });
      if (!res.ok) throw new Error('Failed to generate scenario');
      const data = await res.json();
      if (data.scenario) {
        setScenarios((prev) => [data.scenario, ...prev]);
        handleSelectScenario(data.scenario);
        setCustomTopicInput('');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tạo tình huống lúc này. Vui lòng thử lại!');
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handleResetSession = () => {
    tts.stop();
    stt.stop();
    if (!selectedScenario) return;
    const initialMsg: MessageItem = {
      id: `ai-init-${Date.now()}`,
      role: 'assistant',
      text: selectedScenario.openingLine,
    };
    setMessages([initialMsg]);
    if (autoSpeakAi) {
      setTimeout(() => {
        tts.speak(selectedScenario.openingLine);
      }, 400);
    }
  };

  const handleSendSpeech = async (spokenText: string) => {
    const textToSend = spokenText.trim();
    if (!textToSend || !selectedScenario || isAiThinking) return;

    stt.stop();
    stt.resetTranscript();
    setKeyboardText('');

    const userMsgId = `user-${Date.now()}`;
    const newMessages: MessageItem[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: textToSend,
        latency: stt.firstSpeechLatency,
      },
    ];
    setMessages(newMessages);
    setIsAiThinking(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/roleplay/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          userSpeech: textToSend,
          customScenario: selectedScenario.id.startsWith('custom-') ? selectedScenario : undefined,
          history: historyPayload,
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: data.replyText,
        betterExpression: data.quickFeedback?.naturalExpression,
        grammarNote: data.quickFeedback?.grammarNote,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Speak AI response automatically
      if (autoSpeakAi) {
        tts.speak(data.replyText);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          text: "I couldn't quite catch that. Could you repeat what you just said?",
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const toggleMic = () => {
    if (stt.isListening) {
      const finalVal = stt.getTranscript();
      if (finalVal) {
        void handleSendSpeech(finalVal);
      } else {
        stt.stop();
      }
    } else {
      tts.stop();
      stt.resetTranscript();
      stt.start();
    }
  };

  // Filtered scenarios
  const filteredScenarios = scenarios.filter((sc) => {
    const matchesCategory = selectedCategory === 'Tất cả' || sc.category.includes(selectedCategory.slice(2).trim()) || sc.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim().length === 0 ||
      sc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.context.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.persona.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 1. Scenario Selection Screen
  if (!selectedScenario) {
    return (
      <div className="mx-auto w-full max-w-5xl animate-[fadeUp_0.4s_ease-out]">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/practice"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại luyện câu
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
            <Sparkles className="h-3.5 w-3.5" /> AI Real-time Role-play Debate
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Tình Huống Giả Lập &{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Tranh Biện Trực Tiếp
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400 text-sm sm:text-base">
            Giao tiếp tự nhiên không theo kịch bản trước. AI lắng nghe giọng nói của bạn, phản biện tức thì và kèm mẹo chỉnh lỗi diễn đạt (Coaching) theo thời gian thực!
          </p>
        </div>

        {/* Custom Scenario Generator & Random Surprise Box */}
        <Card className="mb-8 border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-5 shadow-xl shadow-indigo-500/5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Tự tạo tình huống theo ý muốn của bạn</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nhập bất kỳ hoàn cảnh nào bạn muốn trải nghiệm (ví dụ: đòi nợ bạn thân, họp báo, phỏng vấn visa...)
                </p>
              </div>

              {/* Random Surprise Button */}
              <button
                type="button"
                onClick={() => handleGenerateCustomScenario()}
                disabled={isGeneratingCustom}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/15 px-3.5 py-2 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/25 transition-all shadow-sm shrink-0 disabled:opacity-50"
              >
                {isGeneratingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
                <span>🎲 Tình huống ngẫu nhiên bất ngờ</span>
              </button>
            </div>

            {/* Custom Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customTopicInput.trim()) handleGenerateCustomScenario(customTopicInput);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="Ví dụ: Tôi muốn đối thoại với nhân viên chăm sóc khách hàng khi đồ đặt online bị hỏng..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <Button type="submit" disabled={!customTopicInput.trim() || isGeneratingCustom} className="shrink-0 h-10 px-5">
                {isGeneratingCustom ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <PlusCircle className="h-4 w-4 mr-1.5" />}
                <span>Tạo & Bắt đầu</span>
              </Button>
            </form>
          </div>
        </Card>

        {/* Category Filters & Search */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tình huống..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Scenario Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((sc) => (
            <Card
              key={sc.id}
              className="group flex flex-col justify-between border-white/5 bg-white/[0.03] p-5 transition-all hover:border-indigo-500/50 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer"
              onClick={() => handleSelectScenario(sc)}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{sc.icon}</span>
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
                    {sc.category}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {sc.title}
                </h3>
                <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {sc.context}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300 transition-colors">
                  Bắt đầu hội thoại
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 2. Active Roleplay Chat Arena
  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-4xl flex-col animate-[fadeUp_0.3s_ease-out]">
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/60 backdrop-blur px-4 py-3 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              tts.stop();
              stt.stop();
              setSelectedScenario(null);
            }}
            className="flex items-center gap-1 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Đổi kịch bản"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedScenario.icon}</span>
              <h2 className="font-bold text-sm sm:text-base text-white">
                {selectedScenario.title}
              </h2>
            </div>
            <p className="text-[11px] text-indigo-300 truncate max-w-xs sm:max-w-md">
              🎭 {selectedScenario.persona}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Voice Selector */}
          <select
            value={tts.selectedVoiceId}
            onChange={(e) => tts.changeVoice(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 outline-none hover:border-indigo-500/40 focus:ring-1 focus:ring-indigo-400 cursor-pointer"
            title="Chọn giọng AI Neural"
          >
            {tts.voices.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                {v.gender === 'Female' ? '👩' : '👨'} {v.name}
              </option>
            ))}
          </select>

          {/* Audio Auto-play Toggle */}
          <button
            type="button"
            onClick={() => {
              if (tts.isSpeaking) tts.stop();
              setAutoSpeakAi(!autoSpeakAi);
            }}
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              autoSpeakAi
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-white/10 bg-white/5 text-slate-400'
            }`}
            title={autoSpeakAi ? 'Đang bật tự động đọc câu trả lời của AI' : 'Đang tắt tự động đọc'}
          >
            {autoSpeakAi ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">Giọng đọc</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetSession}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
            title="Làm mới cuộc trò chuyện"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40 border-x border-white/10">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-slate-800/90 text-slate-100 border border-white/10 rounded-bl-xs'
              }`}
            >
              {/* Header inside bubble */}
              <div className="flex items-center justify-between gap-3 mb-1 text-[11px] font-semibold opacity-75">
                <span>{m.role === 'user' ? '👤 Bạn' : `🤖 ${selectedScenario.icon} Đối tác AI`}</span>
                <div className="flex items-center gap-2">
                  {m.latency !== null && m.latency !== undefined && (
                    <span className="text-amber-300 font-bold flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> {m.latency}s
                    </span>
                  )}
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => tts.speak(m.text)}
                      className="hover:text-indigo-300 transition-colors p-0.5"
                      title="Nghe lại câu này"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message text */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {m.text}
              </p>
            </div>

            {/* Quick Coaching Note for User's past turn */}
            {m.role === 'assistant' && (m.betterExpression || m.grammarNote) && (
              <div className="mt-2 max-w-[85%] sm:max-w-[75%] rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-200 shadow-sm animate-[fadeIn_0.3s_ease]">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                  <span>Góp ý phản xạ (AI Coach Note):</span>
                </div>
                {m.betterExpression && (
                  <p className="text-slate-200">
                    <span className="text-amber-400 font-semibold">Tự nhiên hơn:</span> “{m.betterExpression}”
                  </p>
                )}
                {m.grammarNote && (
                  <p className="text-slate-300 mt-0.5 italic">
                    💡 {m.grammarNote}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {isAiThinking && (
          <div className="py-2">
            <TypingIndicator label="Đối tác AI đang suy nghĩ phản hồi..." />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starters */}
      {messages.length <= 2 && selectedScenario.starterSuggestions.length > 0 && (
        <div className="border-x border-white/10 bg-slate-900/40 px-4 py-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-1.5">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Gợi ý câu mở đầu đáp lại:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedScenario.starterSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendSpeech(suggestion)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-200 transition-colors text-left"
              >
                “{suggestion}”
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Interactive Control Area */}
      <div className="shrink-0 rounded-b-2xl border-t border-white/10 bg-slate-900/80 p-4 backdrop-blur">
        {/* Voice recognition live preview with volume VU meter */}
        {stt.isListening && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-indigo-500/40 bg-indigo-500/15 p-2.5 text-xs text-white">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-300">Đang lắng nghe:</span>

              {/* Volume VU Bar */}
              <div className="hidden sm:flex items-center gap-1" title={`Âm lượng mic: ${stt.audioLevel}%`}>
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(stt.audioLevel * 1.5, stt.audioLevel > 0 ? 10 : 0))}%` }}
                  />
                </div>
              </div>

              <span className="italic text-slate-200 truncate">
                {stt.transcript || 'Hãy bắt đầu nói bằng tiếng Anh...'}
              </span>
            </div>
            {stt.firstSpeechLatency !== null && (
              <span className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 shrink-0">
                ⚡ Phản xạ: {stt.firstSpeechLatency}s
              </span>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {inputMode === 'voice' ? (
            <div className="flex flex-1 items-center gap-3">
              <Button
                variant={stt.isListening ? 'danger' : 'primary'}
                className="flex-1 h-13 text-base font-semibold shadow-lg shadow-indigo-500/20"
                onClick={toggleMic}
                disabled={isAiThinking}
              >
                {stt.isListening ? (
                  <>
                    <Send className="h-5 w-5 mr-1.5" />
                    <span>Nói xong & Gửi cho AI</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-1.5 animate-pulse text-white" />
                    <span>Bấm để nói tiếng Anh</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setInputMode('keyboard')}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Chuyển sang gõ phím"
              >
                ⌨️
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (keyboardText.trim()) handleSendSpeech(keyboardText);
              }}
              className="flex flex-1 items-center gap-2"
            >
              <input
                type="text"
                value={keyboardText}
                onChange={(e) => setKeyboardText(e.target.value)}
                placeholder="Nhập câu tiếng Anh của bạn..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <Button type="submit" disabled={!keyboardText.trim() || isAiThinking}>
                <Send className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Chuyển sang mic"
              >
                🎙️
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
