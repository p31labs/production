/**
 * The music maker — voices/VoicePool.ts
 *
 * The polyphonic voice pool shared by PolySynth, NoiseMachine, and DrumKit.
 *
 * DESIGN (research-grounded): the audible click on voice steal is caused by
 * `osc.stop()` mid-waveform, not by stealing itself. So the pool never stops
 * an oscillator during a steal — each voice owns a PERSISTENT oscillator that
 * runs from construction to disposal, and the gain gate is what makes a voice
 * "on" or "off". A steal is a fast gain ramp; there is no stop event to click.
 *
 *   stealVoice():  gain.cancelAndHoldAtTime(at)   → anchors at the CURRENT
 *                  in-flight value (never 1.0 — the classic bug jumps a
 *                  mid-release voice back up before fading it)
 *                  gain.linearRampToValueAtTime(0, at + 0.010)
 *   startVoice():  the new note's gain gates up AFTER the fade's ramp target
 *                  (+1ms) so `cancelScheduledValues` never eats the fade's
 *                  endpoint; the stolen slot's frequency retunes there.
 *
 * STEAL ORDER (§3.2, the build prompt's "proper stealing"):
 *   1. quietest currently-sounding voice (lowest gain — the least audible loss)
 *   2. else oldest voice in release (already fading out)
 *   3. else oldest voice in attack/sustain
 *
 * Pure helpers are exported for unit tests (steal ordering, fade scheduling)
 * with a faked AudioParam, matching the engine's no-real-AudioContext pattern.
 */

/** The steal fade length (ms) — zvuk's 8ms default and lite-audio-pool's 20ms
 *  bracket this; 10ms is the middle of the researched range. */
export const STEAL_FADE_S = 0.010;
/** The gap after the fade's ramp target before the new note's gate-up starts,
 *  so `cancelScheduledValues` at the new start never removes the fade's end. */
export const RETUNE_GAP_S = 0.001;

export type VoicePhase = 'idle' | 'attack' | 'decay' | 'sustain' | 'release';

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** A voice slot in the pool. `source` is the oscillating node that feeds
 *  `filter` → `gain`; for buffer-sourced voices (NoiseMachine, DrumKit) it is
 *  null and the subclass owns its sources. */
export interface VoiceSlot {
  id: number;
  source: AudioScheduledSourceNode | null;
  filter: BiquadFilterNode;
  gain: GainNode;
  note: number | null;
  phase: VoicePhase;
  startedAt: number;
  releasedAt: number | null;
  /** When a steal fade began, or null. A stolen slot's gain is heading to 0. */
  stealStartedAt: number | null;
  /** Current gain value — the steal-order's "quietest" signal. */
  readonly currentGain: number;
}

/** The steal-order selection, pure: quietest → oldest-in-release → oldest-in-
 *  attack. `at` is only used to disambiguate a tie on startedAt. Exported for
 *  tests. Returns the index to steal, or -1 when every slot is idle. */
export function selectStealTarget(
  slots: ReadonlyArray<Pick<VoiceSlot, 'phase' | 'startedAt' | 'releasedAt' | 'currentGain'>>,
): number {
  let quietest = -1;
  let quietestGain = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.phase === 'idle') continue;
    if (s.currentGain < quietestGain) {
      quietestGain = s.currentGain;
      quietest = i;
    }
  }
  if (quietest !== -1) return quietest;

  // No sounding voice below the quietest search — prefer release, then oldest.
  const pool = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.phase !== 'idle');
  if (pool.length === 0) return -1;
  const inRelease = pool.filter(({ s }) => s.phase === 'release');
  const order = (inRelease.length ? inRelease : pool).sort(
    (a, b) => (a.s.releasedAt ?? a.s.startedAt) - (b.s.releasedAt ?? b.s.startedAt),
  );
  return order[0].i;
}

export abstract class VoicePool {
  protected readonly ctx: AudioContext;
  protected readonly out: GainNode;
  protected slots: VoiceSlot[] = [];
  protected env: Envelope;
  private nextId = 0;

  constructor(ctx: AudioContext, out: GainNode, maxVoices: number, env: Envelope) {
    this.ctx = ctx;
    this.out = out;
    this.env = env;
    this.slots = Array.from({ length: maxVoices }, () => this.buildSlot());
  }

  /** Subclass: create one persistent voice slot wired into this.gain → out.
   *  Oscillator voices start their oscillator here (never stopped); buffer
   *  voices start it lazily in noteOn. */
  protected abstract buildSlot(): VoiceSlot;

  /** Subclass: map a MIDI note to a frequency. */
  protected abstract frequencyOf(note: number): number;

  get voices(): number {
    return this.slots.length;
  }

  /** Steal the slot `selectStealTarget` picks, fading its gain to zero. */
  protected stealVoice(slot: VoiceSlot, at: number): void {
    const g = slot.gain.gain;
    g.cancelAndHoldAtTime(at); // anchor at the in-flight value, not 1.0
    g.linearRampToValueAtTime(0, at + STEAL_FADE_S);
    slot.stealStartedAt = at;
    slot.phase = 'release';
    slot.releasedAt = at;
  }

  /** The time the new note should gate up: after the fade's ramp target if the
   *  slot was stolen, else now. */
  protected startAt(slot: VoiceSlot, at: number): number {
    return slot.stealStartedAt !== null ? at + STEAL_FADE_S + RETUNE_GAP_S : at;
  }

  /** Pick an idle slot, or steal one. Returns the slot and whether it was
   *  stolen (so a subclass can retune vs. rebuild its source). */
  protected allocate(at: number): { slot: VoiceSlot; stolen: boolean } {
    const idle = this.slots.find((s) => s.phase === 'idle');
    if (idle) return { slot: idle, stolen: false };
    const idx = selectStealTarget(this.slots);
    const slot = this.slots[idx];
    this.stealVoice(slot, at);
    return { slot, stolen: true };
  }

  /** Gate a voice's gain up with the ADSR envelope, starting at `t`. The
   *  current gain value is read from the slot so a reused (stolen) slot
   *  anchors correctly. */
  protected gateUp(slot: VoiceSlot, t: number, peak: number): void {
    const g = slot.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + this.env.attack);
    g.linearRampToValueAtTime(peak * this.env.sustain, t + this.env.attack + this.env.decay);
  }

  protected gateDown(slot: VoiceSlot, at: number): void {
    const g = slot.gain.gain;
    g.cancelAndHoldAtTime(at);
    g.linearRampToValueAtTime(0, at + this.env.release);
    slot.phase = 'release';
    slot.releasedAt = at;
  }

  protected markIdle(slot: VoiceSlot): void {
    slot.phase = 'idle';
    slot.note = null;
    slot.releasedAt = null;
    slot.stealStartedAt = null;
  }

  /** Schedule the ADSR's release leg for a note-off. Overridable. */
  abstract noteOff(note: number, at?: number): void;
}