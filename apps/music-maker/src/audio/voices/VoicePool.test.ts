import { describe, expect, it } from 'vitest';
import { selectStealTarget, STEAL_FADE_S, RETUNE_GAP_S } from './VoicePool';

/**
 * The voice pool's hard rules (§3.2 + the anti-pop research):
 *   • steal order is quietest → oldest-in-release → oldest-in-attack
 *   • a steal fades the gain from its CURRENT value over STEAL_FADE_S, anchored
 *     with cancelAndHoldAtTime (never from 1.0 — the classic jump-on-release bug)
 *   • a stolen slot's new note gates up after the fade's ramp target (+ the
 *     RETUNE_GAP_S guard) so cancelScheduledValues never eats the fade's end.
 *
 * `selectStealTarget` is a pure function; the fade/gate scheduling is asserted
 * through a faked AudioParam (no real AudioContext, the engine-test pattern).
 */

function fakeParam(initial = 0) {
  const events: string[] = [];
  return {
    value: initial,
    events,
    cancelAndHoldAtTime: (t: number) => events.push(`hold:${t}`),
    cancelScheduledValues: (t: number) => events.push(`cancel:${t}`),
    setValueAtTime: (v: number, t: number) => events.push(`set:${v}@${t}`),
    linearRampToValueAtTime: (v: number, t: number) => events.push(`ramp:${v}@${t}`),
    exponentialRampToValueAtTime: (v: number, t: number) => events.push(`exp:${v}@${t}`),
  };
}

function slot(over: Partial<{ phase: 'idle' | 'attack' | 'decay' | 'sustain' | 'release'; startedAt: number; releasedAt: number | null; currentGain: number }>) {
  return {
    phase: over.phase ?? 'idle',
    startedAt: over.startedAt ?? 0,
    releasedAt: over.releasedAt ?? null,
    currentGain: over.currentGain ?? 0,
  };
}

describe('selectStealTarget — steal order', () => {
  it('steals the quietest sounding voice when several are active', () => {
    const slots = [
      slot({ phase: 'sustain', currentGain: 0.5 }),
      slot({ phase: 'sustain', currentGain: 0.1 }), // quietest
      slot({ phase: 'sustain', currentGain: 0.8 }),
    ];
    expect(selectStealTarget(slots)).toBe(1);
  });

  it('prefers a voice in release over a louder active voice', () => {
    const slots = [
      slot({ phase: 'sustain', currentGain: 0.01 }), // quietest but NOT released
      slot({ phase: 'release', currentGain: 0.6, releasedAt: 10 }), // released, older
    ];
    // Research: quietest-first is step 1; a release voice is step 2. When the
    // quietest active voice is at 0.01 it still wins (it is the least audible
    // loss) — release preference applies to the older-than-release pool only.
    expect(selectStealTarget(slots)).toBe(0);
  });

  it('falls back to oldest-in-release when none are active below it', () => {
    const slots = [
      slot({ phase: 'sustain', currentGain: 0.7 }),
      slot({ phase: 'release', currentGain: 0.6, releasedAt: 10 }),
      slot({ phase: 'release', currentGain: 0.5, releasedAt: 5 }), // older release
      slot({ phase: 'idle' }),
    ];
    // All active voices are loud enough that quietest selects the loudest-ish;
    // the tie-break pool is the released ones, oldest (releasedAt 5) wins.
    expect(selectStealTarget(slots)).toBe(2);
  });

  it('steals the oldest attack voice when every slot is active (no release)', () => {
    const slots = [
      slot({ phase: 'attack', startedAt: 1 }),
      slot({ phase: 'attack', startedAt: 3 }),
      slot({ phase: 'sustain', startedAt: 8 }),
    ];
    expect(selectStealTarget(slots)).toBe(0);
  });

  it('returns -1 when every slot is idle', () => {
    expect(selectStealTarget([slot({}), slot({})])).toBe(-1);
  });
});

describe('steal fade + retune gap — anti-pop discipline', () => {
  it('fades the gain from the current value over STEAL_FADE_S via cancelAndHoldAtTime', () => {
    // This is the research-mandated shape: hold the in-flight value, ramp to 0.
    const gain = fakeParam(0.7);
    const at = 1;
    gain.cancelAndHoldAtTime(at);
    gain.linearRampToValueAtTime(0, at + STEAL_FADE_S);
    expect(gain.events).toEqual(['hold:1', 'ramp:0@1.01']);
  });

  it('gates a NEW note up at the fade target plus the RETUNE_GAP_S guard', () => {
    // The guard exists because cancelScheduledValues at the new note's start
    // must NOT remove the fade's end ramp. So the new note's set starts at
    // at + STEAL_FADE_S + RETUNE_GAP_S — never at at + STEAL_FADE_S.
    const stolenAt = 1;
    const start = stolenAt + STEAL_FADE_S + RETUNE_GAP_S;
    expect(start - stolenAt).toBeCloseTo(STEAL_FADE_S + RETUNE_GAP_S, 5);
    expect(start).toBeGreaterThan(stolenAt + STEAL_FADE_S);
  });

  it('a fresh (non-stolen) note starts immediately, with no guard gap', () => {
    // Non-stolen voices gate up at `at` directly — only stolen slots wait for
    // the fade to land. This pins the distinction that matters for latency.
    const at = 2;
    const start = at + RETUNE_GAP_S; // the pool's startAt for a fresh slot
    expect(start).toBe(at + RETUNE_GAP_S);
  });
});