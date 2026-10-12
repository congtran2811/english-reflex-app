'use client';

import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { Volume2 } from 'lucide-react';

interface Props {
  className?: string;
  compact?: boolean;
}

export function VoiceSelector({ className = '', compact = false }: Props) {
  const { voices, selectedVoiceId, changeVoice, speak } = useSpeechSynthesis();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={selectedVoiceId}
        onChange={(e) => {
          const v = e.target.value;
          changeVoice(v);
          // Play a short preview
          speak('Hi! Ready to practice?', v);
        }}
        className="max-w-[75px] xs:max-w-[100px] sm:max-w-none rounded-xl border border-white/10 bg-slate-800/80 px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-medium text-slate-200 outline-none hover:border-indigo-500/40 focus:ring-1 focus:ring-indigo-400 cursor-pointer truncate"
        title="Chọn giọng đọc Neural AI"
      >
        {voices.map((v) => (
          <option key={v.id} value={v.id} className="bg-slate-900 text-white">
            {v.gender === 'Female' ? '👩' : '👨'} {v.name}
          </option>
        ))}
      </select>
    </div>
  );
}
