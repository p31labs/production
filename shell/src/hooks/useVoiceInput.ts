import { useState, useEffect, useRef, useCallback } from 'react';

declare var SpeechRecognition: {
  new(): SpeechRecognition;
};
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}

function createRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

const staticallySupported =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in (window as any));

if (
  import.meta.env.MODE !== 'production' ||
  (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)
) {
  (window as any).__p31_voice = { supported: staticallySupported, autoSendAvailable: true };
}

export function useVoiceInput() {
  const [supported] = useState(() => staticallySupported);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [final, setFinal] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  const abort = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try { r.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    const r = createRecognition();
    if (!r) {
      setError('Speech recognition not available');
      return;
    }
    abort();
    setError(null);
    setTranscript('');
    setFinal(false);
    transcriptRef.current = '';

    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
      transcriptRef.current = final || interim;
    };

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setListening(false);
        recognitionRef.current = null;
        return;
      }
      setError(event.error);
      setListening(false);
      recognitionRef.current = null;
    };

    r.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (transcriptRef.current.trim()) {
        setFinal(true);
      }
    };

    recognitionRef.current = r;
    try {
      r.start();
      setListening(true);
    } catch (e: any) {
      setError(e?.message ?? 'Speech recognition failed');
      recognitionRef.current = null;
    }
  }, [abort]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try { r.stop(); } catch { /* ignore */ }
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    setFinal(false);
    transcriptRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { supported, listening, transcript, error, final, autoSend, setAutoSend, start, stop, reset };
}

export type VoiceHook = ReturnType<typeof useVoiceInput>;
