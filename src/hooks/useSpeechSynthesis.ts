'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: string;
}

export const PRESET_VOICES: VoiceOption[] = [
  { id: 'en-US-JennyNeural', name: 'Jenny (Nữ - Mỹ, tự nhiên & truyền cảm)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (Nam - Mỹ, trầm ấm & đĩnh đạc)', lang: 'en-US', gender: 'Male' },
  { id: 'en-US-AriaNeural', name: 'Aria (Nữ - Mỹ, sôi nổi & biểu cảm)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher (Nam - Mỹ, dẫn chuyện)', lang: 'en-US', gender: 'Male' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Nữ - Anh/London, sang trọng)', lang: 'en-GB', gender: 'Female' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Nam - Anh/London, điềm tĩnh)', lang: 'en-GB', gender: 'Male' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (Nữ - Úc, tự nhiên)', lang: 'en-AU', gender: 'Female' },
];

const PREFERRED_VOICE_KEY = 'reflex.preferredVoiceId';

// Global references preventing V8 garbage collection while playing audio or speaking in Chromium
let globalActiveAudio: HTMLAudioElement | null = null;
let globalActiveUtterance: SpeechSynthesisUtterance | null = null;
let activeSessionId = 0;

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en-US-JennyNeural');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PREFERRED_VOICE_KEY);
      if (saved && PRESET_VOICES.some((v) => v.id === saved)) {
        setSelectedVoiceId(saved);
      }
    }
  }, []);

  const changeVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERRED_VOICE_KEY, voiceId);
    }
  }, []);

  const stop = useCallback(() => {
    activeSessionId++; // Invalidate any previous playback session immediately

    if (globalActiveAudio) {
      try {
        // Crucial: remove event listeners before pause/reset so onerror doesn't trigger fallback
        globalActiveAudio.onended = null;
        globalActiveAudio.onerror = null;
        globalActiveAudio.oncanplay = null;
        globalActiveAudio.pause();
        globalActiveAudio.currentTime = 0;
        globalActiveAudio.src = '';
      } catch {}
      globalActiveAudio = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current.oncanplay = null;
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      globalActiveUtterance = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, overrideVoice?: string, rate?: string, onEnded?: () => void) => {
      if (typeof window === 'undefined') return;
      const cleanText = text.trim();
      if (!cleanText) return;

      // Stop previous playback completely before starting a new one
      stop();

      const sessionId = ++activeSessionId;
      setIsSpeaking(true);

      const voice = overrideVoice || selectedVoiceId;
      const rateParam = rate ? `&rate=${encodeURIComponent(rate)}` : '';
      const url = `/api/tts?text=${encodeURIComponent(cleanText)}&voice=${encodeURIComponent(voice)}${rateParam}`;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;

      globalActiveAudio = audio;
      currentAudioRef.current = audio;

      let isFinished = false;
      const finish = () => {
        if (isFinished || sessionId !== activeSessionId) return;
        isFinished = true;
        setIsSpeaking(false);
        if (globalActiveAudio === audio) {
          globalActiveAudio = null;
        }
        currentAudioRef.current = null;
        if (onEnded) onEnded();
      };

      audio.onended = () => {
        if (sessionId !== activeSessionId) return;
        finish();
      };

      audio.onerror = () => {
        // If superseded by a newer click or stop(), ignore this error completely
        if (sessionId !== activeSessionId) return;

        if (globalActiveAudio === audio) {
          globalActiveAudio = null;
        }
        currentAudioRef.current = null;

        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            globalActiveUtterance = utterance;
            (window as unknown as { __activeUtterance?: SpeechSynthesisUtterance }).__activeUtterance = utterance;
            utterance.lang = 'en-US';
            utterance.rate = 0.95;
            utterance.onend = () => {
              if (sessionId === activeSessionId) {
                finish();
                globalActiveUtterance = null;
              }
            };
            utterance.onerror = () => {
              if (sessionId === activeSessionId) {
                finish();
                globalActiveUtterance = null;
              }
            };
            window.speechSynthesis.speak(utterance);
            return;
          } catch {
            finish();
          }
        } else {
          finish();
        }
      };

      audio.play().catch((err) => {
        if (sessionId !== activeSessionId) return;
        if (err?.name !== 'AbortError') {
          console.warn('[useSpeechSynthesis] audio.play() rejected:', err);
          finish();
        }
      });
    },
    [selectedVoiceId, stop],
  );

  return {
    speak,
    stop,
    isSpeaking,
    selectedVoiceId,
    changeVoice,
    voices: PRESET_VOICES,
  };
}
