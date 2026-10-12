'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SpeechError, SpeechRecognitionOptions, SpeechSupportStatus } from '@/types/speech';
import { normalizeSpeechError, isSpeechRecognitionSupported } from '@/services/speech/web-speech.adapter';
import { SPEECH_LANG } from '@/lib/constants';

const noopSubscribe = () => () => {};

// Chrome-compatible speech recognition ctor accessor
function getSpeechCtor() {
  if (typeof window === 'undefined') return null;
  return (
    (window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition as (new () => SpeechRecognitionLike) | undefined ??
    ((window as typeof window & { webkitSpeechRecognition?: unknown })
      .webkitSpeechRecognition as (new () => SpeechRecognitionLike) | undefined) ??
    null
  );
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

export interface UseSpeechRecognitionReturn {
  support: SpeechSupportStatus;
  isListening: boolean;
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  firstSpeechLatency: number | null; // seconds until user first uttered sound
  audioLevel: number; // 0 - 100 volume meter for live voice feedback
  error: SpeechError | null;
  start: () => void;
  stop: () => void;
  restart: () => void;
  resetTranscript: () => void;
  getTranscript: () => string;
}

export function useSpeechRecognition(_options: SpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const support = useSyncExternalStore<SpeechSupportStatus>(
    noopSubscribe,
    () => (isSpeechRecognitionSupported() ? 'supported' : 'unsupported'),
    () => 'unknown',
  );

  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinal] = useState('');
  const [interimTranscript, setInterim] = useState('');
  const [firstSpeechLatency, setFirstSpeechLatency] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<SpeechError | null>(null);

  // All mutable state lives in refs so callbacks never have stale closures
  const finalRef = useRef('');
  const interimRef = useRef('');
  const activeRef = useRef(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // AudioContext & AnalyserNode for hardware mic booster + Live VU meter
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Reflex latency tracking
  const turnStartTimeRef = useRef<number | null>(null);
  const firstSpeechLatencyRef = useRef<number | null>(null);

  const markSpeechDetected = useCallback(() => {
    if (firstSpeechLatencyRef.current === null && turnStartTimeRef.current !== null) {
      const latency = Number(((Date.now() - turnStartTimeRef.current) / 1000).toFixed(2));
      firstSpeechLatencyRef.current = latency;
      setFirstSpeechLatency(latency);
    }
  }, []);

  // Cleanup hardware audio stream & analyser
  const stopHardwareAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        void audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Start hardware mic capture with Advanced DSP constraints (Noise suppression, Echo cancel, Auto gain)
  const startHardwareAudio = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      stopHardwareAudio();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // Chống dội âm từ loa vào mic
          noiseSuppression: true, // Bộ lọc khử ồn môi trường
          autoGainControl: true, // Tự động cân bằng và khuếch đại âm lượng giọng nói
          channelCount: 1, // Kênh đơn tập trung vào giọng nói
        },
      });
      streamRef.current = stream;

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const pcmData = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!activeRef.current) return;
        analyser.getByteFrequencyData(pcmData);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i];
        }
        const avg = sum / pcmData.length;
        // Normalize to 0 - 100 scale with responsive curve
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(level);

        // If user is actually speaking (above threshold), mark speech
        if (level > 8) {
          markSpeechDetected();
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[useSpeechRecognition] Hardware audio initialization warning:', err);
    }
  }, [markSpeechDetected, stopHardwareAudio]);

  // Create and start a fresh recognition instance.
  const spawn = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setError({ code: 'not-supported', message: 'Speech recognition not supported. Use Chrome or Edge.' });
      return;
    }

    // Destroy any previous instance cleanly
    if (recRef.current) {
      const old = recRef.current;
      old.onstart = null;
      old.onresult = null;
      old.onerror = null;
      old.onend = null;
      try {
        old.abort();
      } catch {}
      recRef.current = null;
    }

    const rec = new Ctor();
    rec.lang = SPEECH_LANG;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Detect speech start for reflex latency
    if ('onspeechstart' in rec) {
      (rec as unknown as { onspeechstart: () => void }).onspeechstart = () => {
        markSpeechDetected();
      };
    }

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (e) => {
      markSpeechDetected();
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0]?.transcript ?? '';
        if (e.results[i].isFinal) final += text;
        else interim += text;
      }
      if (final) {
        finalRef.current = `${finalRef.current} ${final}`.replace(/\s+/g, ' ').trim();
        setFinal(finalRef.current);
      }
      interimRef.current = interim;
      setInterim(interim);
    };

    rec.onerror = (e) => {
      // no-speech and aborted are benign in Chrome / Edge
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      const err = normalizeSpeechError(e.error);
      setError(err);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        activeRef.current = false;
        stopHardwareAudio();
      }
    };

    rec.onend = () => {
      if (activeRef.current) {
        // Auto-reconnect if killed by silent timeout
        setTimeout(() => {
          if (activeRef.current) spawn();
        }, 50);
      } else {
        setIsListening(false);
      }
    };

    recRef.current = rec;
    setError(null);
    try {
      rec.start();
    } catch (err) {
      console.error('[STT] start() threw:', err);
    }
  }, [markSpeechDetected, stopHardwareAudio]);

  const start = useCallback(() => {
    turnStartTimeRef.current = Date.now();
    firstSpeechLatencyRef.current = null;
    setFirstSpeechLatency(null);
    activeRef.current = true;
    void startHardwareAudio();
    spawn();
  }, [spawn, startHardwareAudio]);

  const stop = useCallback(() => {
    activeRef.current = false;
    stopHardwareAudio();
    if (recRef.current) {
      recRef.current.onend = null;
      try {
        recRef.current.stop();
      } catch {}
      recRef.current = null;
    }
    setIsListening(false);
  }, [stopHardwareAudio]);

  const restart = useCallback(() => {
    turnStartTimeRef.current = Date.now();
    firstSpeechLatencyRef.current = null;
    setFirstSpeechLatency(null);
    activeRef.current = true;
    void startHardwareAudio();
    spawn();
  }, [spawn, startHardwareAudio]);

  const resetTranscript = useCallback(() => {
    finalRef.current = '';
    interimRef.current = '';
    turnStartTimeRef.current = Date.now();
    firstSpeechLatencyRef.current = null;
    setFinal('');
    setInterim('');
    setFirstSpeechLatency(null);
  }, []);

  const getTranscript = useCallback(
    () => `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim(),
    [],
  );

  // Cleanup on unmount
  useEffect(() => () => {
    activeRef.current = false;
    stopHardwareAudio();
    if (recRef.current) {
      recRef.current.onend = null;
      try {
        recRef.current.abort();
      } catch {}
      recRef.current = null;
    }
  }, [stopHardwareAudio]);

  return {
    support,
    isListening,
    transcript: `${finalTranscript} ${interimTranscript}`.trim(),
    finalTranscript,
    interimTranscript,
    firstSpeechLatency,
    audioLevel,
    error,
    start,
    stop,
    restart,
    resetTranscript,
    getTranscript,
  };
}
