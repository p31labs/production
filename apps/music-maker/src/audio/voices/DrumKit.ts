/**
 * The music maker — voices/DrumKit.ts
 *
 * An 8-pad drum machine (§3.2). Unlike PolySynth/NoiseMachine, a drum hit is a
 * ONE-SHOT — it plays and dies; there is no sustain to hold. Each pad is a
 * small synthesis recipe (a pitched component + a noise transient + an
 * envelope), not a sample file. Because a hit is transient, the pool's
 * persistent-oscillator rule doesn't apply: the transient IS the click-free
 * shape (a fresh source with a fast attack and a timed decay), and stealing
 * fades the dying pad's gain before its source stops.
 *
 * Pads (order): kick, snare, hat, clap, tom-lo, tom-hi, rim, crash.
 * Per-pad params: tune, decay, pan, level — named, router-validated.
 */

import { VoicePool, type Envelope, type VoiceSlot } from './VoicePool';

export const DRUM_PADS = ['kick', 'snare', 'hat', 'clap', 'tom-lo', 'tom-hi', 'rim', 'crash'] as const;
export type DrumPad = (typeof DRUM_PADS)[number];
export const DRUM_PARAMS = ['tune', 'decay', 'pan', 'level'] as const;
export type DrumParam = (typeof DRUM_PARAMS)[number];

/** Base frequencies per pad (Hz) — the tuned note each pad's pitched element
 *  sits on; `tune` (± semitones) offsets it. */
const PAD_TUNE_HZ: Record<DrumPad, number> = {
  kick: 55,
  snare: 180,
  hat: 8000,
  clap: 1200,
  'tom-lo': 110,
  'tom-hi': 165,
  rim: 2400,
  crash: 6000,
};

const DEFAULT_ENV: Envelope = { attack: 0.002, decay: 0.25, sustain: 0, release: 0.05 };

interface DrumSlot extends VoiceSlot {
  pitched: OscillatorNode;
  noiseSource: AudioBufferSourceNode;
  noiseGain: GainNode;
  panner: StereoPannerNode;
  pad: DrumPad | null;
}

export class DrumKit extends VoicePool {
  private noiseBuffer: AudioBuffer;
  /** Per-pad param state, seeded to neutral (tune 0 semitones, decay 1.0
   *  (unit-less multiplier), pan center, level full). */
  private padParams: Record<DrumPad, Record<DrumParam, number>> = {
    kick: { tune: 0, decay: 1, pan: 0, level: 1 },
    snare: { tune: 0, decay: 1, pan: 0, level: 1 },
    hat: { tune: 0, decay: 1, pan: 0, level: 1 },
    clap: { tune: 0, decay: 1, pan: 0, level: 1 },
    'tom-lo': { tune: 0, decay: 1, pan: 0, level: 1 },
    'tom-hi': { tune: 0, decay: 1, pan: 0, level: 1 },
    rim: { tune: 0, decay: 1, pan: 0, level: 1 },
    crash: { tune: 0, decay: 1, pan: 0, level: 1 },
  };

  constructor(ctx: AudioContext, out: GainNode, maxVoices = 8) {
    super(ctx, out, maxVoices, DEFAULT_ENV);
    this.noiseBuffer = buildNoiseBuffer(ctx, 1);
  }

  protected buildSlot(): DrumSlot {
    // Pitched element (sine) + a noise transient, summed into a filter → gain,
    // panned, into the bus. A drum "voice" is a reusable pad channel; each hit
    // retunes + re-gates it (a persistent source per slot — safe to steal).
    const pitched = this.ctx.createOscillator();
    pitched.type = 'sine';
    pitched.frequency.value = 55;
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = 0;
    pitched.connect(gain);
    noiseSource.connect(noiseGain);
    noiseGain.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.out);
    pitched.start();
    noiseSource.start();
    const slot: DrumSlot = {
      id: this.slots.length,
      source: null,
      pitched,
      noiseSource,
      noiseGain,
      filter,
      gain,
      panner,
      pad: null,
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
    return PAD_TUNE_HZ[DRUM_PADS[Math.max(0, Math.min(DRUM_PADS.length - 1, note))]] ?? 55;
  }

  /** Set a per-pad param. Address is `<pad>.<param>`, e.g. 'kick.tune'.
   *  Returns false for unknown pads/params (the router's validation gate). */
  setParam(name: string, value: number | string): boolean {
    const dot = name.indexOf('.');
    if (dot === -1) return false;
    const pad = name.slice(0, dot) as DrumPad;
    const param = name.slice(dot + 1) as DrumParam;
    if (!DRUM_PADS.includes(pad) || !DRUM_PARAMS.includes(param)) return false;
    const n = typeof value === 'number' ? value : Number.parseFloat(value);
    if (!Number.isFinite(n)) return false;
    // tune: -12..+12 semitones; decay: 0.25..2.0x; pan: -1..1; level: 0..1.
    this.padParams[pad][param] = n;
    return true;
  }

  /** Trigger pad by index (0..7) or by name. `noteOn` is the MIDI-ish entry. */
  hit(pad: DrumPad, velocity = 1): void {
    const at = this.ctx.currentTime;
    const { slot, stolen } = this.allocate(at);
    const t = this.startAt(slot, at);
    const s = slot as DrumSlot;
    const p = this.padParams[pad];

    // Retune at fade-complete point (same discipline as PolySynth).
    const semis = Math.max(-12, Math.min(12, p.tune));
    const freq = PAD_TUNE_HZ[pad] * Math.pow(2, semis / 12);
    s.pitched.frequency.cancelScheduledValues(t);
    s.pitched.frequency.setValueAtTime(freq, t);
    s.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, p.pan)), t);

    // Per-pad recipe: how much noise, what filter shape.
    const decay = Math.max(0.05, Math.min(2, p.decay));
    const level = Math.max(0, Math.min(1, p.level)) * velocity;
    const noiseMix = pad === 'kick' ? 0.15 : pad === 'crash' ? 0.8 : 0.6;
    const filterCut = pad === 'kick' ? 400 : pad === 'hat' || pad === 'crash' ? 10000 : 3000;

    const g = s.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(level, t + 0.002);
    g.exponentialRampToValueAtTime(0.001, t + decay);

    const ng = s.noiseGain.gain;
    ng.cancelScheduledValues(t);
    ng.setValueAtTime(noiseMix * level, t);
    ng.exponentialRampToValueAtTime(0.001, t + decay * 0.8);

    s.filter.frequency.setValueAtTime(filterCut, t);

    (slot as DrumSlot).pad = pad;
    slot.note = DRUM_PADS.indexOf(pad);
    slot.phase = 'release'; // one-shot: it is already decaying
    slot.startedAt = t;
    slot.stealStartedAt = null;

    // Wall-clock delay (audio clock can drift from the page clock).
    const idleMs = (decay + 0.05) * 1000;
    setTimeout(() => { if (slot.phase === 'release') this.markIdle(slot); }, idleMs);
    void stolen;
  }

  noteOn(padIndex: number, velocity = 1): void {
    const pad = DRUM_PADS[Math.max(0, Math.min(DRUM_PADS.length - 1, padIndex))];
    this.hit(pad, velocity);
  }

  noteOff(): void {
    // One-shots self-terminate; nothing to release on note-off.
  }
}

function buildNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}