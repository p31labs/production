import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useVoice } from '../voice/useVoice';
import type { SpeechRecognitionLike } from '../voice/voiceSupport';

interface FakeEvent {
  silent?: boolean;
}

function installFakeRecognition(events: FakeEvent[]): void {
  let idx = 0;
  class FakeRecognition implements SpeechRecognitionLike {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onresult: SpeechRecognitionLike['onresult'] = null;

    start() {
      this.onstart?.();
      const event = events[idx] ?? events[events.length - 1];
      idx += 1;
      if (event?.silent) {
        this.onerror?.({ error: 'no-speech' });
        this.onend?.();
      }
    }
    stop() {
      /* noop */
    }
    abort() {
      /* noop */
    }
  }
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
}

describe('voice-health — Chrome 15s no-speech → rebuild → rest', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = undefined;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = undefined;
  });

  afterEach(() => cleanup());

  it('starts listening on a supported browser', async () => {
    installFakeRecognition([]);
    const { result } = renderHook(() => useVoice({ maxReconnects: 1 }));

    act(() => result.current.start());
    expect(result.current.voiceHealth).toBe('listening');
    expect(result.current.supported).toBe(true);
  });

  it('reports unsupported when no SpeechRecognition exists', () => {
    const { result } = renderHook(() => useVoice());
    expect(result.current.supported).toBe(false);
    expect(result.current.voiceHealth).toBe('unsupported');
  });

  it('rebuilds the mic after no-speech and settles to idle after the reconnect budget', async () => {
    installFakeRecognition([{ silent: true }, { silent: true }, { silent: true }, { silent: true }]);
    const { result } = renderHook(() => useVoice({ maxReconnects: 1 }));

    act(() => result.current.start());

    // the synchronous fake already delivered no-speech → rebuilding the mic
    expect(result.current.voiceHealth).toBe('reconnecting');

    // silent end #2 → budget exhausted → idle, amber cue signal
    await waitFor(() => expect(result.current.voiceHealth).toBe('idle'), { timeout: 1500 });
    expect(result.current.reconnectCount).toBeGreaterThan(0);
  });
});