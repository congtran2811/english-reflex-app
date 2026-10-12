'use client';

import { useEffect, useRef } from 'react';

export interface KeyboardShortcutHandlers {
  onTogglePause?: () => void;
  onSubmit?: () => void;
  onEscape?: () => void;
  onReset?: () => void;
}

/**
 * Space → toggle pause, Enter → submit early, Esc → onEscape (falls back to toggle pause), R → onReset.
 * Ignored while typing in inputs/textareas.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled = true): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.repeat) return;

      const h = ref.current;
      if (e.code === 'Space') {
        e.preventDefault();
        h.onTogglePause?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        h.onSubmit?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        (h.onEscape ?? h.onTogglePause)?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        h.onReset?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
