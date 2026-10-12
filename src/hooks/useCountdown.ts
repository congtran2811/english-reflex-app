'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TURN_DURATION_SECONDS } from '@/lib/constants';

export interface UseCountdownReturn {
  /** Remaining time in seconds (fractional). */
  timeLeft: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (seconds?: number) => void;
  /** Precise remaining seconds, safe to call from event handlers. */
  getTimeLeft: () => number;
}

/**
 * Pausable countdown driven by requestAnimationFrame + performance.now(),
 * so pausing preserves remaining time precisely (no interval drift).
 */
export function useCountdown(
  durationSeconds: number = TURN_DURATION_SECONDS,
  onExpire?: () => void,
): UseCountdownReturn {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);

  const remainingMsRef = useRef(durationSeconds * 1000);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const resume = useCallback(() => {
    if (startedAtRef.current !== null || remainingMsRef.current <= 0) return;
    startedAtRef.current = performance.now();
    setIsRunning(true);

    const loop = () => {
      if (startedAtRef.current === null) return;
      const elapsed = performance.now() - startedAtRef.current;
      const left = Math.max(0, remainingMsRef.current - elapsed);
      setTimeLeft(left / 1000);
      if (left <= 0) {
        remainingMsRef.current = 0;
        startedAtRef.current = null;
        rafRef.current = null;
        setIsRunning(false);
        onExpireRef.current?.();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const durationRef = useRef(durationSeconds);
  useEffect(() => {
    durationRef.current = durationSeconds;
    if (!isRunning) {
      remainingMsRef.current = durationSeconds * 1000;
      setTimeLeft(durationSeconds);
    }
  }, [durationSeconds, isRunning]);

  const getTimeLeft = useCallback(() => {
    const running = startedAtRef.current !== null ? performance.now() - startedAtRef.current : 0;
    return Math.max(0, remainingMsRef.current - running) / 1000;
  }, []);

  const pause = useCallback(() => {
    if (startedAtRef.current === null) return;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - (performance.now() - startedAtRef.current));
    startedAtRef.current = null;
    setIsRunning(false);
    setTimeLeft(remainingMsRef.current / 1000);
    stopLoop();
  }, [stopLoop]);

  const reset = useCallback(
    (seconds: number = durationRef.current) => {
      stopLoop();
      startedAtRef.current = null;
      remainingMsRef.current = seconds * 1000;
      setIsRunning(false);
      setTimeLeft(seconds);
    },
    [stopLoop],
  );

  const start = useCallback((seconds?: number) => {
    reset(seconds);
    resume();
  }, [reset, resume]);

  useEffect(() => stopLoop, [stopLoop]);

  return { timeLeft, isRunning, start, pause, resume, reset, getTimeLeft };
}
