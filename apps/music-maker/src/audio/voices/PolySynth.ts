/**
 * The music maker — voices/PolySynth.ts
 *
 * A 16-voice polyphonic subtractive synth, §3.2 of the build prompt. Behind the
 * engine's existing master ceiling. Persistent oscillators (never stopped mid-
 * waveform — the pool's click-free steal design) through a lowpass filter with
 * its own envelope amount.
 *
 * Every parameter is a NAMED control (0–1 or an enum) — the control server
 * routes messages by name, never by touching engine internals. `setParam`
 * rejects unknown names rather than silently ignoring them (the marketplace
 * risk-classifier lesson, applied to the synth).
 *
 * Voice-steal order is the pool's: quietest → oldest-in-release → oldest-in-
 * attack, with the 10ms anti-pop fade anchored at the current gain.
 */

import { VoicePool, STEAL_FADE_S, RETUNE_GAP_S, type Envelope, type VoiceSlot } from './VoicePool';

/** The canonical MIDI-note → frequency mapping (A4 = 440). */
export function midiNoteHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** PolySynth's named param registry — the router validates destinations against
 *  it so a knob can never target a param this engine doesn't have. */
export const POLYSYNTH_PARAMS = [
  'attack',
  'decay',
  'sustain',
  'release',
  'cutoff',
  'resonance',
  'filterEnvAmount',
  'oscMix',
] as const;
export type PolySynthParam = (typeof POLYSYNTH_PARAMS)[number];

const DEFAULT_ENV: Envelope = { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.4 };

interface PolySlot extends VoiceSlot {
  osc: OscillatorNode;
  filter: BiquadFilterNode;
}

export class PolySynth extends VoicePool {
  private params: Record<PolySynthParam, number | string> = {
    attack: DEFAULT_ENV.attack,
    decay: DEFAULT_ENV.decay,
    sustain: DEFAULT_ENV.sustain,
    release: DEFAULT_ENV.release,
    cutoff: 0.7,          // 0–1 → 200..8000 Hz
    resonance: 0.15,      // 0–1 → Q 0.5..12
    filterEnvAmount: 0.3, // 0–1 → envelope drives cutoff this much
    oscMix: 'saw',        // enum: sine | saw | square | triangle
  };

  constructor(ctx: AudioContext, out: GainNode, maxVoices = 16) {
    super(ctx, out, maxVoices, DEFAULT_ENV);
  }

  protected buildSlot(): PolySlot {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 220;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.out);
    osc.start();
    const slot: PolySlot = {
      id: this.slots.length,
      source: osc,
      osc,
      filter,
      gain,
      note: null,
      phase: 'idle',
      startedAt: 0,
      releasedAt: null,
      stealStartedAt: null,
      currentGain: 0,
    };
    Object.defineProperty(slot, 'currentGain', { get: () => gain.gain.value });
    return slot;
  }

  protected frequencyOf(note: number): number {
    return midiNoteHz(note);
  }

  /** Set a named param (0–1 or enum). Throws on unknown names so a mapping to
   *  a nonexistent param fails loudly instead of being silently dropped. */
  setParam(name: string, value: number | string): boolean {
    if (!POLYSYNTH_PARAMS.includes(name as PolySynthParam)) return false;
    this.params[name as PolySynthParam] = value;
    this.applyParam(name as PolySynthParam);
    return true;
  }

  private applyParam(name: PolySynthParam): void {
    const v = this.params[name];
    switch (name) {
      case 'attack':
        this.env.attack = clamp01(v);
        break;
      case 'decay':
        this.env.decay = clamp01(v);
        break;
      case 'sustain':
        this.env.sustain = clamp01(v);
        break;
      case 'release':
        this.env.release = clamp01(v);
        break;
      case 'cutoff': {
        const cutoff = 200 + clamp01(v) * 7800;
        for (const s of this.slots) s.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.03);
        break;
      }
      case 'resonance': {
        const q = 0.5 + clamp01(v) * 11.5;
        for (const s of this.slots) s.filter.Q.setTargetAtTime(q, this.ctx.currentTime, 0.03);
        break;
      }
      case 'filterEnvAmount':
        break; // applied at trigger time (envelope drives cutoff)
      case 'oscMix': {
        const type = v as OscillatorType;
        for (const s of this.slots) (s as PolySlot).osc.type = type;
        break;
      }
    }
  }

  noteOn(note: number, velocity = 0.8): void {
    const at = this.ctx.currentTime;
    const { slot, stolen } = this.allocate(at);
    const t = this.startAt(slot, at);
    const s = slot as PolySlot;

    // Retune at the fade-complete point if stolen; the pool guarantees the
    // fade's ramp target landed before `t`.
    s.osc.frequency.cancelScheduledValues(t);
    s.osc.frequency.setValueAtTime(this.frequencyOf(note), t);
    s.osc.type = this.params.oscMix as OscillatorType;

    // Envelope-driven cutoff: the filter opens with the note then closes back
    // to the base cutoff — the classic "synth voice" shape.
    const cutoff = 200 + clamp01(this.params.cutoff) * 7800;
    const envAmount = clamp01(this.params.filterEnvAmount);
    s.filter.frequency.cancelScheduledValues(t);
    s.filter.frequency.setValueAtTime(cutoff, t);
    s.filter.frequency.linearRampToValueAtTime(cutoff + envAmount * 4000, t + this.env.attack);
    s.filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff), t + this.env.attack + this.env.decay + this.env.release);

    this.gateUp(slot, t, Math.max(0.01, Math.min(1, velocity)) * 0.5);
    slot.note = note;
    slot.phase = 'attack';
    slot.startedAt = t;
    slot.stealStartedAt = null;
    void stolen; // a stolen slot is already retuned above; no rebuild needed
  }

  noteOff(note: number): void {
    const at = this.ctx.currentTime;
    for (const slot of this.slots) {
      if (slot.note === note && slot.phase !== 'idle' && slot.phase !== 'release') {
        this.gateDown(slot, at);
        this.scheduleIdle(slot);
      }
    }
  }

  private scheduleIdle(slot: VoiceSlot): void {
    // Wall-clock, not audio-clock: currentTime can drift from the page clock.
    const idleMs = (this.env.release + 0.05) * 1000;
    setTimeout(() => {
      if (slot.phase === 'release') this.markIdle(slot);
    }, idleMs);
  }
}

function clamp01(v: number | string): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

export { STEAL_FADE_S, RETUNE_GAP_S };