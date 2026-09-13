import { useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognition,
  MAX_RECONNECTS,
  REBUILD_DELAY_MS,
  type VoiceHealth,
  type SpeechRecognitionLike,
} from './voiceSupport';

export interface UseVoiceOptions {
  lang?: string;
  onTranscript?: (text: string) => void;
  onResult?: (text: string) => void;
  continuous?: boolean;
  maxReconnects?: number;
}

export interface VoiceHandle {
  voiceHealth: VoiceHealth;
  supported: boolean;
  reconnectCount: number;
  start: () => void;
  stop: () => void;
}

/**
 * Browser voice with a graceful downhill slope:
 *
 *   Chrome            → full support (webkit prefix), 15s-silence rebuild ×N
 *   Safari            → full support (prefixed)
 *   Edge / Chromium   → full support
 *   Firefox           → experimental (flag) → treated as 'unsupported'
 *
 * The rebuild flow: no-speech end event → teardown → fresh instance → restart.
 * After `maxReconnects` failed rebuilds we settle to 'idle' (amber mic cue)
 * so the UI never loops forever.
 */
export function useVoice(options: UseVoiceOptions = {}): VoiceHandle {
  const {
    lang = 'en-US',
    onTranscript,
    onResult,
    continuous = false,
    maxReconnects = MAX_RECONNECTS,
  } = options;

  const [voiceHealth, setVoiceHealth] = useState<VoiceHealth>('idle');
  const [reconnectCount, setReconnectCount] = useState(0);
  const healthRef = useRef<VoiceHealth>('idle');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const restartsRef = useRef(0);
  const silencePanicRef = useRef(false);
  const stoppedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onResultRef = useRef(onResult);
  onTranscriptRef.current = onTranscript;
  onResultRef.current = onResult;

  const destroy = () => {
    const rec = recRef.current;
    if (!rec) return;
    rec.onstart = null;
    rec.onend = null;
    rec.onerror = null;
    rec.onresult = null;
    try {
      rec.abort();
    } catch {
      /* already dead */
    }
    recRef.current = null;
  };

  const setHealth = (next: VoiceHealth) => {
    healthRef.current = next;
    setVoiceHealth(next);
  };

  function attach(rec: SpeechRecognitionLike) {
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      silencePanicRef.current = false;
      setHealth('listening');
    };

    rec.onresult = (event) => {
      silencePanicRef.current = false;
      if (event.results.length === 0) return;
      const idx = event.resultIndex ?? 0;
      const slot = event.results[Math.min(idx, event.results.length - 1)];
      if (slot && slot[0]) {
        const transcript = slot[0].transcript ?? '';
        if (transcript) {
          onResultRef.current?.(transcript);
          if (!rec.continuous) {
            onTranscriptRef.current?.(transcript);
          }
        }
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setHealth('permission_denied');
        stoppedRef.current = true;
        return;
      }
      if (event.error === 'no-speech') {
        silencePanicRef.current = true;
        return;
      }
      if (event.error === 'aborted' && stoppedRef.current) return;
      setHealth('idle');
    };

    rec.onend = () => {
      if (stoppedRef.current) {
        setHealth('idle');
        return;
      }
      if (silencePanicRef.current || healthRef.current === 'listening') {
        restartsRef.current += 1;
        if (restartsRef.current > maxReconnects) {
          setHealth('idle');
          setReconnectCount(restartsRef.current);
          silencePanicRef.current = false;
          return;
        }
        setHealth('reconnecting');
        setReconnectCount(restartsRef.current);
        destroy();
        window.setTimeout(() => {
          if (stoppedRef.current) return;
          const fresh = getSpeechRecognition();
          if (!fresh) {
            setHealth('unsupported');
            return;
          }
          recRef.current = fresh;
          attach(fresh);
          stoppedRef.current = false;
          try {
            fresh.start();
            if (healthRef.current === 'reconnecting') {
              setHealth('listening');
            }
          } catch {
            destroy();
            setHealth('idle');
          }
        }, REBUILD_DELAY_MS);
        return;
      }
      setHealth('idle');
    };
  }

  const start = () => {
    const rec = getSpeechRecognition();
    if (!rec) {
      setHealth('unsupported');
      return;
    }
    stoppedRef.current = false;
    restartsRef.current = 0;
    destroy();
    recRef.current = rec;
    attach(rec);
    try {
      rec.start();
      if (healthRef.current === 'idle') {
        setHealth('listening');
      }
    } catch {
      setHealth('idle');
    }
  };

  const stop = () => {
    stoppedRef.current = true;
    destroy();
    setHealth('idle');
  };

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setHealth('unsupported');
    }
    return () => {
      stoppedRef.current = true;
      destroy();
    };
  }, []);

  return {
    voiceHealth,
    supported: voiceHealth !== 'unsupported',
    reconnectCount,
    start,
    stop,
  };
}