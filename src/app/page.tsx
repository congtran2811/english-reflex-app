import Link from 'next/link';
import { Mic, Zap, Brain, ChevronRight } from 'lucide-react';
import { Button, buttonVariants } from '@/components/common/Button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)] px-6 py-20 text-center">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
      
      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 animate-[fadeUp_0.5s_ease-out]">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300">
          <Zap className="h-4 w-4" /> Bật phản xạ tiếng Anh trong 10 giây
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Nghĩ tiếng Việt. <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            Nói tiếng Anh.
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">
          Ứng dụng luyện phản xạ dịch trực tiếp bằng giọng nói. Không gõ phím. Không suy nghĩ lâu. Chỉ 10 giây để trả lời.
        </p>
        
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/practice" className={buttonVariants('primary', 'h-14 px-7 text-base sm:text-lg')}>
            Bắt đầu luyện tập <ChevronRight className="h-5 w-5" />
          </Link>
          <Link href="/listening" className={buttonVariants('secondary', 'h-14 px-7 text-base sm:text-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20')}>
            🎧 Luyện nghe phản xạ
          </Link>
          <Link href="/roleplay" className={buttonVariants('secondary', 'h-14 px-7 text-base sm:text-lg border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20')}>
            🎭 Tranh biện vai diễn
          </Link>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-indigo-400 ring-1 ring-white/10">
              <Mic className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white">Nói trực tiếp</h3>
            <p className="text-sm text-slate-400">Tự động nhận diện giọng nói qua Web Speech API.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-fuchsia-400 ring-1 ring-white/10">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white">Áp lực thời gian</h3>
            <p className="text-sm text-slate-400">Mỗi câu chỉ có 10 giây để rèn luyện tốc độ phản xạ.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-emerald-400 ring-1 ring-white/10">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white">AI Phân tích</h3>
            <p className="text-sm text-slate-400">Gemini AI nhận xét cách diễn đạt tự nhiên như người bản xứ.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
