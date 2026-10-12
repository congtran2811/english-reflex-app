export type SpeechSupportStatus = 'unknown' | 'supported' | 'unsupported';

export type SpeechErrorCode =
  | 'not-supported'
  | 'permission-denied'
  | 'no-microphone'
  | 'network'
  | 'aborted'
  | 'no-speech'
  | 'unknown';

export interface SpeechError {
  code: SpeechErrorCode;
  message: string;
}

export interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface TranscriptState {
  /** Finalized text accumulated across recognition results/restarts. */
  finalTranscript: string;
  /** Current in-progress (interim) text. */
  interimTranscript: string;
}

/** Normalized events emitted by the web speech adapter. */
export interface SpeechAdapterHandlers {
  onResult: (finalChunk: string, interim: string) => void;
  onError: (error: SpeechError) => void;
  onEnd: () => void;
  onStart?: () => void;
}
