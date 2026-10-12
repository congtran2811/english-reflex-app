'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, Play, Trash2, Volume2, X } from 'lucide-react';
import {
  getSavedMistakes,
  removeMistake,
  toggleMastered,
  type SavedMistakeItem,
} from '@/lib/mistakes';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import type { PracticePrompt } from '@/types/practice';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPracticeMistakes: (prompts: PracticePrompt[]) => void;
}

export function MistakesModal({ isOpen, onClose, onPracticeMistakes }: Props) {
  const [items, setItems] = useState<SavedMistakeItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'need_practice' | 'mastered'>('all');
  const { speak, isSpeaking } = useSpeechSynthesis();

  const loadData = () => {
    setItems(getSavedMistakes());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = items.filter((item) => {
    if (filter === 'need_practice') return !item.isMastered;
    if (filter === 'mastered') return item.isMastered;
    return true;
  });

  const handleToggle = (id: string) => {
    toggleMastered(id);
    loadData();
  };

  const handleRemove = (id: string) => {
    removeMistake(id);
    loadData();
  };

  const handleStartPractice = () => {
    const needPractice = items.filter((i) => !i.isMastered);
    const targetItems = needPractice.length > 0 ? needPractice : items;
    if (!targetItems.length) return;

    // Convert to PracticePrompt[] (take up to 10)
    const prompts: PracticePrompt[] = targetItems.slice(0, 10).map((m) => ({
      id: m.promptId || m.id,
      level: (m.level as PracticePrompt['level']) || 'B1',
      vietnamese: m.vietnamese,
      referenceTranslation: m.nativeVersion,
      partnerQuestion: m.partnerQuestion,
    }));

    onPracticeMistakes(prompts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 shrink-0">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Sổ tay câu sai</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Tự động lưu các câu &lt; 70 điểm để ôn tập
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/5 bg-white/[0.02] px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                filter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('need_practice')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                filter === 'need_practice' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chưa thuộc ({items.filter((i) => !i.isMastered).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('mastered')}
              className={`rounded-lg px-3 py-1 font-medium transition-all ${
                filter === 'mastered' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Đã thuộc ({items.filter((i) => i.isMastered).length})
            </button>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleStartPractice}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Luyện ngay ({Math.min(10, items.filter((i) => !i.isMastered).length || items.length)} câu)
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-base font-semibold text-slate-200">
                {items.length === 0
                  ? 'Chưa có câu sai nào trong sổ tay!'
                  : 'Không có câu nào trong mục này.'}
              </p>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Khi bạn luyện tập và gặp câu có điểm dưới 70, hệ thống sẽ tự động lưu vào đây để bạn ôn lại.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`group flex flex-col gap-2 rounded-2xl border p-4 transition-all ${
                  item.isMastered
                    ? 'border-emerald-500/20 bg-emerald-950/10 opacity-70'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {item.partnerQuestion && (
                      <p className="text-xs font-semibold text-indigo-400 mb-0.5">
                        🗣️ Đối tác: “{item.partnerQuestion}”
                      </p>
                    )}
                    <p className="text-sm font-semibold text-white">
                      {item.partnerQuestion ? `Ý bạn đáp: ${item.vietnamese}` : item.vietnamese}
                    </p>
                    <p className="mt-1 text-xs text-rose-300/80 line-through">
                      “{item.userTranscript}”
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
                      {item.score}/100
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      title={item.isMastered ? 'Đánh dấu chưa thuộc' : 'Đánh dấu đã thuộc'}
                      className={`rounded-lg p-1.5 transition-colors ${
                        item.isMastered
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      title="Xóa khỏi sổ tay"
                      className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Native sentence + Speech button */}
                <div className="mt-1 flex items-center justify-between rounded-xl bg-emerald-500/[0.08] px-3 py-2 text-xs text-emerald-200">
                  <span className="font-medium">{item.nativeVersion}</span>
                  <button
                    type="button"
                    onClick={() => speak(item.nativeVersion)}
                    title="Nghe phát âm chuẩn"
                    className="flex shrink-0 items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Nghe</span>
                  </button>
                </div>

                {item.tip && (
                  <p className="text-[11px] text-amber-300/80 italic">💡 {item.tip}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
