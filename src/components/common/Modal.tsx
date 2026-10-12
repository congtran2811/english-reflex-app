'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export function Modal({ isOpen, onClose, children, className, closeOnBackdrop = false }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-[fadeUp_0.2s_ease-out]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-2xl animate-[fadeUp_0.25s_ease-out]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
