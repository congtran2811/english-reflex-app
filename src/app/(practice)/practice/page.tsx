import Link from 'next/link';
import { LEVELS } from '@/data';
import { Card } from '@/components/common/Card';
import { ChevronRight } from 'lucide-react';

export default function LevelSelectionPage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-3.5 py-6 sm:p-6 sm:pt-20 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)]">
      <div className="w-full max-w-3xl animate-[fadeUp_0.4s_ease-out]">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-4xl">Chọn cấp độ của bạn</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">Mỗi lượt gồm 10 câu hỏi, được chọn ngẫu nhiên từ thư viện.</p>
        </div>

        {/* Banner: Real-time AI Voice Chat & Role-play Debate */}
        <Link href="/roleplay" className="group mb-4 block">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 p-5 shadow-lg shadow-indigo-500/10 transition-all hover:border-indigo-400 hover:scale-[1.01]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl ring-1 ring-indigo-500/30">
                  🎭
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-500/30">
                      Voice Role-play
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-200 transition-colors">
                      Đối Thoại & Tranh Biện Tình Huống Với AI
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Phỏng vấn xin việc, khiếu nại khách sạn, mặc cả mua hàng... AI phản hồi bằng giọng nói và chỉnh sửa lỗi diễn đạt theo thời gian thực!
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-300 group-hover:translate-x-1 transition-transform">
                <span>Tham gia ngay</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* Banner: Listening Reflex Arena with CEFR Level division */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/50 p-5 shadow-lg shadow-emerald-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl ring-1 ring-emerald-500/30">
                🎧
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                    Luyện Nghe Phản Xạ
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Listening Reflex Arena Theo 4 Cấp Độ
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Audio Echo, Bắt từ khóa, Điền từ khuyết & Tăng tốc độ (0.8x ➔ 1.4x) kèm tạp âm môi trường thực tế.
                </p>
                {/* Level Quick Select */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { id: 'A1_A2', label: 'A1–A2 Cơ bản' },
                    { id: 'B1', label: 'B1 Trung cấp' },
                    { id: 'B2', label: 'B2 Khá' },
                    { id: 'C1', label: 'C1 Nâng cao' },
                  ].map((l) => (
                    <Link
                      key={l.id}
                      href={`/listening?level=${l.id}`}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 hover:text-white transition-colors"
                    >
                      {l.label} ➔
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/listening"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300 hover:translate-x-1 transition-transform sm:self-center"
            >
              <span>Vào phòng nghe</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {LEVELS.map((level) => (
            <Link key={level.id} href={`/practice/${level.id}`} className="group block focus-visible:outline-none">
              <Card className="h-full border-white/5 bg-white/[0.02] transition-all hover:border-indigo-500/50 hover:bg-white/[0.04] group-focus-visible:ring-2 group-focus-visible:ring-indigo-400">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20">
                      Level {level.label}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-white">{level.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-slate-400">{level.description}</p>
                  
                  <div className="mt-6 flex flex-wrap gap-2">
                    {level.tags.map(tag => (
                      <span key={tag} className="rounded-md bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
