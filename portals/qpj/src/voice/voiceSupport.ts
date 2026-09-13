export type VoiceHealth =
  | 'unsupported'
  | 'idle'
  | 'listening'
  | 'reconnecting'
  | 'permission_denied';

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
}

export interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

export function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor =
    (w.SpeechRecognition as SpeechRecognitionCtor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionCtor | undefined) ??
    null;
  return ctor ? new ctor() : null;
}

/** Chrome tears down silent sessions after ~15s — the rebuild must happen on the instance, not via retry on a closed one. */
export const CHROME_SILENCE_TIMEOUT_MS = 15000;
export const MAX_RECONNECTS = 3;
export const REBUILD_DELAY_MS = 300;