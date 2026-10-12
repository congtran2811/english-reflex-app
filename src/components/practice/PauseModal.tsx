'use client';

import { Play, RotateCcw, LogOut, PauseCircle, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { formatSeconds } from '@/lib/utils';

export interface PauseModalProps {
  isOpen: boolean;
  timeLeft: number;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseModal({
  isOpen,
  timeLeft,
  onResume,
  onRestart,
  onQuit,
}: PauseModalProps) {
  return (
    <Modal isOpen={isOpen}>
      <div className="flex flex-col items-center text-center">
        {/* Header Icon */}
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
          <PauseCircle className="h-8 w-8 animate-pulse" />
        </div>

        <h2 className="text-xl font-bold text-white">Phiên luyện tập đang tạm dừng</h2>

        {/* Status Callout */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10">
          <span className="font-semibold text-indigo-300 tabular-nums">
            ⏱ Đóng băng tại: {formatSeconds(timeLeft)}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Microphone đã tắt</span>
        </div>

        {/* Anti-cheat disclaimer */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-xs text-amber-200/90">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            Câu hỏi tiếng Việt đã được làm mờ để bảo toàn tính phản xạ và chống nhìn trước.
          </span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <Button
            id="pause-modal-resume"
            onClick={onResume}
            className="w-full py-3 text-sm font-bold"
          >
            <Play className="h-4 w-4 fill-current" />
            Tiếp tục (Resume)
            <kbd className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
              Space
            </kbd>
          </Button>

          <Button
            id="pause-modal-restart"
            variant="secondary"
            onClick={onRestart}
            className="w-full py-2.5 text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Làm lại câu này (Restart)
          </Button>

          <Button
            id="pause-modal-quit"
            variant="danger"
            onClick={onQuit}
            className="w-full py-2.5 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Thoát phiên luyện tập (Quit)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
