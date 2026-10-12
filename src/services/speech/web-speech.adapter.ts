import type { SpeechAdapterHandlers, SpeechError, SpeechErrorCode, SpeechRecognitionOptions } from '@/types/speech';
import { SPEECH_LANG } from '@/lib/constants';

/* Minimal typings for the (non-standard) Web Speech API. */
interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: SpeechRecognitionAlternativeLike; length: number }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionErrorEventLike { error: string; message?: string }

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

const ERROR_MAP: Record<string, { code: SpeechErrorCode; message: string }> = {
  'not-allowed': { code: 'permission-denied', message: 'Microphone access was blocked. Allow it in your browser site settings and reload.' },
  'service-not-allowed': { code: 'permission-denied', message: 'Speech service is not allowed in this context. Use Chrome or Edge over HTTPS/localhost.' },
  'audio-capture': { code: 'no-microphone', message: 'No microphone detected. Please connect one and try again.' },
  network: { code: 'network', message: 'Speech recognition needs an internet connection.' },
  aborted: { code: 'aborted', message: 'Recognition aborted.' },
  'no-speech': { code: 'no-speech', message: 'No speech detected.' },
};

export function normalizeSpeechError(raw: string): SpeechError {
  return ERROR_MAP[raw] ?? { code: 'unknown', message: `Speech recognition error: ${raw}` };
}

/**
 * Creates a configured recognition instance and wires normalized handlers.
 * Returns null when the browser lacks support.
 */
export function createRecognition(
  handlers: SpeechAdapterHandlers,
  options: SpeechRecognitionOptions = {},
): SpeechRecognitionLike | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = options.lang ?? SPEECH_LANG;
  rec.continuous = options.continuous ?? true;
  rec.interimResults = options.interimResults ?? true;
  rec.maxAlternatives = 1;

  rec.onstart = () => handlers.onStart?.();
  rec.onresult = (event) => {
    let finalChunk = '';
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? '';
      if (result.isFinal) finalChunk += text;
      else interim += text;
    }
    handlers.onResult(finalChunk, interim);
  };
  rec.onerror = (e) => handlers.onError(normalizeSpeechError(e.error));
  rec.onend = () => handlers.onEnd();

  return rec;
}
