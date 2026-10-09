/**
 * The music maker — voices/NoiseMachine.ts
 *
 * An 8-voice noise engine (§3.2). Each voice is a looping white-noise buffer
 * through a pitch-tracking bandpass (the noise "speaks" at a pitch) with a
 * tilt filter (white → pink → brown). A "grain" mode switches the envelope
 * from sustain to short windowed bursts.
 *
 * Same pool discipline as PolySynth: persistent buffer sources, gain-gate on/
 * off, click-free steal. Same named-param contract — the router validates
 * against NOISEMACHINE_PARAMS before routing.
 */

import { VoicePool, type Envelope, type VoiceSlot } from './VoicePool';

export const NOISEMACHINE_PARAMS = [
  'grainSize',
  'density',
  'pitchSpread',
  'tilt',
  'attack',
  'decay',
] as const;
export type NoiseMachineParam = (typeof NOISEMACHINE_PARAMS)[number];

const DEFAULT_ENV: Envelope = { attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.3 };

interface NoiseSlot extends VoiceSlot {
  sourceNode: AudioBufferSourceNode;
  bandpass: BiquadFilterNode;
  tilt: BiquadFilterNode;
}

export class NoiseMachine extends VoicePool {
  private noiseBuffer: AudioBuffer;
  private params: Record<NoiseMachineParam, number | string> = {
    grainSize: 0.5,    // 0–1 → grain window length
    density: 0.5,      // 0–1 → how many voices fire per trigger
    pitchSpread: 0.3,  // 0–1 → ± cents around the note
    tilt: 0,           // 0..2 → 0=white, 1=pink, 2=brown
    attack: DEFAULT_ENV.attack,
    decay: DEFAULT_ENV.decay,
  };
  /** Grain mode: off by default; on = short windowed bursts (no sustain). */
  private grain = false;

  constructor(ctx: AudioContext, out: GainNode, maxVoices = 8) {
    super(ctx, out, maxVoices, DEFAULT_ENV);
    this.noiseBuffer = buildNoiseBuffer(ctx, 2);
  }

  protected buildSlot(): NoiseSlot {
    const sourceNode = this.ctx.createBufferSource();
    sourceNode.buffer = this.noiseBuffer;
    sourceNode.loop = true;
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 440;
    bandpass.Q.value = 1.5;
    const tilt = this.ctx.createBiquadFilter();
    tilt.type = 'lowpass';
    tilt.frequency.value = 12000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    sourceNode.connect(tilt);
    tilt.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.out);
    sourceNode.start();
    const slot: NoiseSlot = {
      id: this.slots.length,
      source: sourceNode,
      sourceNode,
      bandpass,
      tilt,
      filter: bandpass, // the base slot's filter is the pitch-tracking bandpass
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
    // Noise has no fundamental — the bandpass center is the "pitch".
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  setParam(name: string, value: number | string): boolean {
    if (!NOISEMACHINE_PARAMS.includes(name as NoiseMachineParam)) return false;
    this.params[name as NoiseMachineParam] = value;
    this.applyParam(name as NoiseMachineParam);
    return true;
  }

  setGrainMode(on: boolean): void {
    this.grain = on;
  }

  private applyParam(name: NoiseMachineParam): void {
    const v = this.params[name];
    switch (name) {
      case 'attack':
        this.env.attack = clamp01(v);
        break;
      case 'decay':
        this.env.decay = clamp01(v);
        break;
      case 'tilt': {
        // 0..2: white → pink (lowpass ~/-3dB) → brown (lowpass ~/-6dB).
        const f = 6000 - clamp01(v) * 4500; // 6000 → 1500 Hz shelving
        for (const s of this.slots) (s as NoiseSlot).tilt.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
        break;
      }
      case 'grainSize':
      case 'density':
      case 'pitchSpread':
        break; // applied at trigger time
    }
  }

  noteOn(note: number, velocity = 0.8): void {
    const at = this.ctx.currentTime;
    const spread = clamp01(this.params.pitchSpread) * 60; // ±60 cents
    const detuned = note + (Math.random() * 2 - 1) * (spread / 100);
    const { slot } = this.allocate(at);
    const t = this.startAt(slot, at);
    const s = slot as NoiseSlot;
    const center = this.frequencyOf(detuned);
    s.bandpass.frequency.cancelScheduledValues(t);
    s.bandpass.frequency.setValueAtTime(center, t);
    s.bandpass.Q.value = 1.5;

    if (this.grain) {
      // Grain: short windowed burst, then back to idle.
      const grainLen = 0.02 + clamp01(this.params.grainSize) * 0.18;
      const g = s.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
      g.linearRampToValueAtTime(0.4 * velocity, t + 0.002);
      g.exponentialRampToValueAtTime(0.001, t + grainLen);
      slot.note = note;
      slot.phase = 'release';
      slot.startedAt = t;
      slot.stealStartedAt = null;
      // Wall-clock delay (audio clock can drift from the page clock).
      const idleMs = (grainLen + 0.02) * 1000;
      setTimeout(() => { if (slot.phase === 'release') this.markIdle(slot); }, idleMs);
      return;
    }

    this.gateUp(slot, t, Math.max(0.01, Math.min(1, velocity)) * 0.35);
    slot.note = note;
    slot.phase = 'attack';
    slot.startedAt = t;
    slot.stealStartedAt = null;
  }

  noteOff(note: number): void {
    const at = this.ctx.currentTime;
    for (const slot of this.slots) {
      if (slot.note === note && slot.phase !== 'idle' && slot.phase !== 'release') {
        this.gateDown(slot, at);
        const idleMs = (this.env.release + 0.05) * 1000;
        setTimeout(() => { if (slot.phase === 'release') this.markIdle(slot); }, idleMs);
      }
    }
  }
}

/** Build a shared 2s white-noise buffer (looped by every source). */
function buildNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function clamp01(v: number | string): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}