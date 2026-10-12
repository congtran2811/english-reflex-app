'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Brain, Headphones, Activity, Lightbulb, Compass, Zap } from 'lucide-react';
import { Card } from '@/components/common/Card';

const EVALUATION_STEPS = [
  { label: 'Đo lường độ trễ phản xạ (Speech Latency)', desc: 'Phân tích thời gian từ lúc nhận đề đến khi bắt đầu cất tiếng nói' },
  { label: 'Phân tích từ vựng & cấu trúc ngữ pháp', desc: 'Kiểm tra độ chính xác, thì động từ và liên kết câu' },
  { label: 'Trích xuất gợi ý diễn đạt tự nhiên (Native Polish)', desc: 'Tìm kiếm cách nói của người bản xứ ngắn gọn, tinh tế hơn' },
  { label: 'Tổng hợp bảng điểm & bài tập khắc phục', desc: 'Hoàn thiện thống kê XP, xếp hạng phản xạ và lưu lịch sử' },
];

const REFLEX_TIPS = [
  '💡 Mẹo: Đừng cố dịch từng chữ trong đầu. Hãy nắm bắt ý niệm chính rồi bật ra cụm từ đầu tiên xuất hiện.',
  '⚡ Nói nhanh và mắc lỗi nhỏ tốt hơn việc im lặng quá lâu để chau chuốt ngữ pháp hoàn hảo.',
  '🎯 Bắt đầu nói trong vòng dưới 1.5 giây là tiêu chuẩn vàng của phản xạ giao tiếp tự nhiên.',
  '🎧 Luyện nghe nối âm và nuốt âm sẽ giúp bạn vừa nghe hiểu tốt hơn vừa nói mượt mà hơn.',
];

/**
 * Premium Evaluation Loading Screen for Practice Session (10 turns evaluation)
 */
export function EvaluationLoadingView() {
  const [activeStep, setActiveStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % EVALUATION_STEPS.length);
    }, 2500);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % REFLEX_TIPS.length);
    }, 4000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.floor(Math.random() * 8) + 3;
      });
    }, 600);

    return () => {
      clearInterval(stepInterval);
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <Card className="mx-auto w-full max-w-xl text-center p-8 animate-[fadeUp_0.3s_ease-out] relative overflow-hidden border border-indigo-500/30 shadow-2xl shadow-indigo-950/50">
      {/* Background ambient glowing blurs */}
      <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

      {/* Central Pulsing Radar Orb */}
      <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping opacity-75 duration-1000" />
        <div className="absolute -inset-3 rounded-full border border-indigo-500/30 animate-spin [animation-duration:8s]" />
        <div className="absolute -inset-6 rounded-full border border-purple-500/15 animate-spin [animation-duration:12s] [animation-direction:reverse]" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 shadow-lg shadow-indigo-500/30">
          <Brain className="h-10 w-10 text-white animate-pulse" />
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30 mb-2">
        <Sparkles className="h-3.5 w-3.5 animate-spin [animation-duration:3s]" /> AI Deep Reflex Analysis
      </span>

      <h2 className="text-2xl font-black text-white tracking-tight mt-1">
        Đang chấm điểm 10 câu phản xạ của bạn…
      </h2>
      <p className="text-xs text-slate-400 mt-1">
        Hệ thống AI đang phân tích từng câu thoại và đo lường chỉ số phản xạ
      </p>

      {/* Dynamic Animated Progress Bar */}
      <div className="w-full bg-white/5 rounded-full h-2.5 mt-6 mb-6 overflow-hidden p-0.5 border border-white/10">
        <div
          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-indigo-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stepped progress indicators */}
      <div className="space-y-2.5 text-left mb-6">
        {EVALUATION_STEPS.map((step, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-xl p-2.5 transition-all duration-300 ${
                isCurrent
                  ? 'bg-indigo-600/15 border border-indigo-500/30 shadow-md ring-1 ring-indigo-400/20'
                  : 'bg-white/[0.02] border border-white/5 opacity-70'
              }`}
            >
              <div className="mt-0.5">
                {isDone ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    ✓
                  </span>
                ) : isCurrent ? (
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 items-center justify-center text-[9px] text-white font-bold">
                      •
                    </span>
                  </span>
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-slate-500 text-[10px]">
                    {idx + 1}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-semibold ${isCurrent ? 'text-indigo-200' : 'text-slate-300'}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rotating Reflex Tip Card */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left transition-all duration-500">
        <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
          {REFLEX_TIPS[tipIndex]}
        </p>
      </div>
    </Card>
  );
}

/**
 * Sleek Preparing/Generating Prompts Overlay / Card
 */
export function GeneratingPromptsLoadingView({ topic, level }: { topic?: string; level?: string }) {
  return (
    <Card className="mx-auto w-full max-w-lg text-center p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden animate-[fadeUp_0.3s_ease]">
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

      {/* Orbiting particles */}
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-indigo-400 animate-spin [animation-duration:10s]" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <Zap className="h-8 w-8 text-white animate-bounce" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
          Level {level || 'B1'}
        </span>
        {topic && (
          <span className="rounded-full bg-purple-500/10 px-3 py-0.5 text-xs font-bold text-purple-300 ring-1 ring-purple-500/20 line-clamp-1 max-w-[200px]">
            {topic}
          </span>
        )}
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight">
        AI đang tạo bộ đề phản xạ mới…
      </h3>
      <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
        Đang khởi tạo các tình huống giao tiếp đời thường độc đáo, hoàn toàn không trùng lặp đề cũ.
      </p>

      {/* Animated wave bars */}
      <div className="flex items-center justify-center gap-1.5 h-6 mt-6">
        {[0, 150, 300, 450, 600].map((delay, i) => (
          <div
            key={i}
            className="w-1.5 bg-indigo-400 rounded-full animate-pulse"
            style={{
              height: `${14 + (i % 3) * 8}px`,
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </Card>
  );
}

/**
 * Listening Session Generator Loading View
 */
export function ListeningLoadingView() {
  return (
    <Card className="mx-auto w-full max-w-lg text-center p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden animate-[fadeUp_0.3s_ease]">
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
        <div className="absolute -inset-2 rounded-full border border-indigo-500/30 animate-ping opacity-60 duration-1000" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/30">
          <Headphones className="h-8 w-8 text-white animate-pulse" />
        </div>
      </div>

      <span className="rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
        🎧 Audio Reflex Generator
      </span>

      <h3 className="text-xl font-bold text-white mt-2">
        Đang tạo bộ bài nghe phản xạ chất lượng cao…
      </h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
        Bóc tách âm nuốt, nối âm (linking sounds) & hiệu chỉnh nấc tốc độ 0.8x - 1.4x
      </p>

      {/* Soundwave animation */}
      <div className="flex items-center justify-center gap-1 h-8 mt-6">
        {[20, 40, 60, 80, 50, 70, 30, 90, 65, 45, 30].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-indigo-600 to-purple-400 rounded-full animate-pulse"
            style={{
              height: `${h * 0.3}px`,
              animationDuration: `${0.6 + (i % 4) * 0.2}s`,
            }}
          />
        ))}
      </div>
    </Card>
  );
}

/**
 * Skeleton Loader for Turn Review scoring
 */
export function TurnReviewSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5 text-center animate-pulse space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400 animate-spin [animation-duration:2s]" />
        <span className="text-sm font-semibold text-indigo-300">
          AI đang phân tích phản xạ & cách diễn đạt của bạn…
        </span>
      </div>
      <div className="mx-auto h-12 w-28 rounded-xl bg-white/10" />
      <div className="mx-auto h-4 w-3/4 rounded-lg bg-white/5" />
      <div className="mx-auto h-3 w-1/2 rounded-lg bg-white/5" />
    </div>
  );
}

/**
 * Typing Indicator with bouncing gradient dots (for Roleplay AI partner)
 */
export function TypingIndicator({ label = 'Đối tác AI đang suy nghĩ phản hồi...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 w-fit animate-[fadeIn_0.2s_ease]">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-pink-400 animate-bounce" />
      </div>
      <span className="text-xs text-slate-300 font-medium">{label}</span>
    </div>
  );
}
