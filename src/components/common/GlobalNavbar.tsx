'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home, Zap, MessageSquare, BookOpen, Headphones } from 'lucide-react';
import { VoiceSelector } from '@/components/common/VoiceSelector';

export function GlobalNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isPractice = pathname.startsWith('/practice');
  const isRoleplay = pathname.startsWith('/roleplay');
  const isListening = pathname.startsWith('/listening');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-2.5 sm:px-6 gap-1">
        {/* Left: History Navigation (Back / Forward) & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* History Back / Forward Buttons */}
          <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 p-0.5 sm:p-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Quay lại trang trước (Back)"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              type="button"
              onClick={() => router.forward()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Tiến tới trang sau (Forward)"
            >
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Logo / Home Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold text-white hover:text-indigo-300 transition-colors"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-xs text-white shadow-md shadow-indigo-500/20">
              ⚡
            </span>
            <span className="hidden md:inline font-extrabold tracking-tight text-sm">
              English Reflex
            </span>
          </Link>
        </div>

        {/* Center: Main Navigation Modes */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/practice"
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-semibold transition-all ${
              isPractice
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Phản xạ</span>
            <span className="hidden sm:inline">Luyện phản xạ</span>
          </Link>

          <Link
            href="/listening"
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-semibold transition-all ${
              isListening
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Headphones className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Nghe</span>
            <span className="hidden sm:inline">Luyện nghe</span>
          </Link>

          <Link
            href="/roleplay"
            className={`flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-semibold transition-all ${
              isRoleplay
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-fuchsia-400 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Roleplay</span>
            <span className="hidden sm:inline">Tranh biện</span>
          </Link>
        </div>

        {/* Right: Quick Voice Selector Dropdown */}
        <div className="flex items-center gap-1 shrink-0">
          <VoiceSelector />
        </div>
      </div>
    </nav>
  );
}
