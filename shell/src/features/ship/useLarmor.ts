import { useState, useRef, useCallback, useEffect } from 'react';
import { useEffectsStore } from '../../store/useEffectsStore';

const LARMOR_BASE = 172.35;
const LARMOR_HARMONIC = 863.00;
const GAIN_MIN = 0.02;
const GAIN_MAX = 0.08;

export function useLarmorAudio(coherence = 0) {
  const larmorActive = useEffectsStore((s) => s.larmorActive);
  const toggleLarmor = useEffectsStore((s) => s.toggleLarmor);
  const [active, setActive] = useState(larmorActive);
  const [freq, setFreq] = useState(LARMOR_BASE);
  const [gain, setGain] = useState(GAIN_MIN);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const start = useCallback(() => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const f = LARMOR_BASE + (LARMOR_HARMONIC - LARMOR_BASE) * coherence;
      const gg = GAIN_MIN + (GAIN_MAX - GAIN_MIN) * coherence;
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      g.gain.setValueAtTime(gg, ctx.currentTime);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      ctxRef.current = ctx;
      oscRef.current = osc;
      gainRef.current = g;
      setActive(true);
      setFreq(f);
      setGain(gg);
    }
  }, [coherence]);

  const stop = useCallback(() => {
    oscRef.current?.stop();
    oscRef.current?.disconnect();
    ctxRef.current?.close();
    ctxRef.current = null;
    oscRef.current = null;
    gainRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    if (larmorActive) {
      start();
    } else {
      stop();
    }
    return () => {
      stop();
    };
  }, [larmorActive, start, stop]);

  useEffect(() => {
    const f = LARMOR_BASE + (LARMOR_HARMONIC - LARMOR_BASE) * coherence;
    const g = GAIN_MIN + (GAIN_MAX - GAIN_MIN) * coherence;
    setFreq(f);
    setGain(g);
    if (active && oscRef.current && ctxRef.current) {
      oscRef.current.frequency.setValueAtTime(f, ctxRef.current.currentTime);
      gainRef.current?.gain.setValueAtTime(g, ctxRef.current.currentTime);
    }
  }, [coherence, active]);

  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      (window as any).__p31_larmor = { active, freq, gain, coherence };
      (window as any).__p31_toggleLarmor = toggleLarmor;
    }
  }, [active, freq, gain, coherence, toggleLarmor]);

  return { active, freq, gain, toggle: toggleLarmor };
}
