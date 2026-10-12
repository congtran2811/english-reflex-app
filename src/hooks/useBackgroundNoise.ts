'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

export type BackgroundNoiseType = 'none' | 'cafe' | 'subway' | 'rain' | 'phone';

export interface NoiseOption {
  id: BackgroundNoiseType;
  label: string;
  icon: string;
  description: string;
}

export const NOISE_OPTIONS: NoiseOption[] = [
  { id: 'none', label: 'Yên tĩnh', icon: '🤫', description: 'Phòng thu tiêu chuẩn' },
  { id: 'cafe', label: 'Quán Cafe', icon: '☕', description: 'Tiếng trò chuyện & thìa ly rì rầm' },
  { id: 'subway', label: 'Ga tàu / Sân bay', icon: '🚇', description: 'Tiếng ồn động cơ & đám đông' },
  { id: 'rain', label: 'Đường phố mưa', icon: '🌧️', description: 'Tiếng mưa rơi & xe cộ xa xa' },
  { id: 'phone', label: 'Điện thoại', icon: '📞', description: 'Bộ lọc âm thoại nén băng thông' },
];

export function useBackgroundNoise() {
  const [currentNoise, setCurrentNoise] = useState<BackgroundNoiseType>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodesRef = useRef<{ source: AudioNode; gain: GainNode } | null>(null);

  // Stop current noise generator
  const stopNoise = useCallback(() => {
    if (noiseNodesRef.current) {
      try {
        if ('stop' in noiseNodesRef.current.source) {
          (noiseNodesRef.current.source as AudioBufferSourceNode).stop();
        }
        noiseNodesRef.current.source.disconnect();
        noiseNodesRef.current.gain.disconnect();
      } catch {}
      noiseNodesRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Web Audio Synthetic Ambient Sound Generator (100% offline, zero asset files needed)
  const startNoise = useCallback(
    (type: BackgroundNoiseType) => {
      stopNoise();
      if (type === 'none') {
        setCurrentNoise('none');
        return;
      }

      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const bufferSize = ctx.sampleRate * 4; // 4 seconds loop
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate synthetic ambient textures
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;

          if (type === 'cafe') {
            // Warm murmur (low-frequency pink noise + gentle bursts)
            lastOut = (lastOut + 0.02 * white) / 1.02;
            const chatter = Math.sin(i / 1200) * 0.04 + Math.sin(i / 400) * 0.02;
            data[i] = lastOut * 0.8 + chatter;
          } else if (type === 'rain') {
            // Brown noise + high sizzle (soft rain)
            lastOut = (lastOut + 0.015 * white) / 1.015;
            data[i] = lastOut * 0.7 + white * 0.02;
          } else if (type === 'subway') {
            // Deep rumble (subway / airport hum)
            lastOut = (lastOut + 0.008 * white) / 1.008;
            data[i] = lastOut * 1.2;
          } else if (type === 'phone') {
            // Band-pass filter simulation (telephone line hiss)
            data[i] = white * 0.08;
          }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = ctx.createGain();
        // Gentle background volume so it doesn't drown out speech
        gainNode.gain.value = type === 'phone' ? 0.08 : 0.15;

        // Apply Biquad Filter for acoustic realism
        const filter = ctx.createBiquadFilter();
        if (type === 'phone') {
          filter.type = 'bandpass';
          filter.frequency.value = 1400;
          filter.Q.value = 2.0;
        } else if (type === 'subway') {
          filter.type = 'lowpass';
          filter.frequency.value = 350;
        } else {
          filter.type = 'lowpass';
          filter.frequency.value = 1800;
        }

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start();
        noiseNodesRef.current = { source, gain: gainNode };
        setCurrentNoise(type);
        setIsPlaying(true);
      } catch (err) {
        console.warn('[useBackgroundNoise] Web Audio failed:', err);
      }
    },
    [stopNoise],
  );

  useEffect(() => {
    return () => {
      stopNoise();
    };
  }, [stopNoise]);

  return {
    currentNoise,
    isPlaying,
    startNoise,
    stopNoise,
    options: NOISE_OPTIONS,
  };
}
