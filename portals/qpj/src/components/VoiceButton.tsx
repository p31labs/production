import { useEffect, useRef } from 'react';
import { useVoice } from '../voice/useVoice';
import type { VoiceHealth } from '../voice/voiceSupport';

export interface VoiceButtonProps {
  onResult: (text: string) => void;
  lang?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

const HEALTH_META: Record<VoiceHealth, { cue: string; live: boolean }> = {
  unsupported: { cue: 'Voice unavailable in this browser', live: false },
  idle: { cue: 'Tap to speak', live: false },
  listening: { cue: 'Listening…', live: true },
  reconnecting: { cue: 'Mic reconnecting — give it a second', live: true },
  permission_denied: { cue: 'Microphone permission blocked', live: false },
};

export function VoiceButton({
  onResult,
  lang = 'en-US',
  size = 'lg',
  label = 'Talk to the jar',
  ariaLabel,
  disabled = false,
}: VoiceButtonProps) {
  const { voiceHealth, supported, reconnectCount, start, stop } = useVoice({
    lang,
    onResult,
    continuous: false,
    maxReconnects: 3,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const meta = HEALTH_META[voiceHealth];
  const listening = voiceHealth === 'listening';

  useEffect(() => {
    if (voiceHealth === 'unsupported') return;
    btnRef.current?.setAttribute('data-voice-health', voiceHealth);
  }, [voiceHealth]);

  if (!supported) {
    return (
      <button
        type="button"
        className={`voice-button voice-button--${size} voice-button--unsupported`}
        disabled
        aria-disabled="true"
        title="Voice requires Chrome, Edge, or Safari"
      >
        <MicGlyph muted />
        <span className="voice-button__label">Voice off</span>
      </button>
    );
  }

  const toggle = () => {
    if (listening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className={`voice-toggle voice-toggle--${size}`} role="group">
      <button
        ref={btnRef}
        type="button"
        className={`voice-button voice-button--${size}${listening ? ' voice-button--listening' : ''}${voiceHealth === 'reconnecting' ? ' voice-button--amber' : ''}${voiceHealth === 'permission_denied' ? ' voice-button--danger' : ''}`}
        onClick={toggle}
        aria-pressed={listening}
        aria-expanded={listening}
        aria-label={ariaLabel ?? `${label}${listening ? ' (stop)' : ''}`}
        disabled={disabled || voiceHealth === 'permission_denied'}
      >
        <MicGlyph />
        <span className="voice-button__label">{listening ? 'Stop' : label}</span>
        {voiceHealth === 'reconnecting' && (
          <span className="voice-button__pulse" aria-hidden="true" />
        )}
      </button>
      <span className="voice-button__cue" role="status" aria-live="polite">
        {meta.cue}
        {voiceHealth === 'idle' && reconnectCount > 0 ? ' (mic rested after a few tries)' : ''}
      </span>
    </div>
  );
}

function MicGlyph({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      {muted ? (
        <line x1="4" y1="4" x2="20" y2="20" />
      ) : (
        <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
      )}
    </svg>
  );
}