/**
 * The control registry — the canonical destination set.
 *
 * The router MUST validate destinations against this list — the marketplace
 * build's risk-classifier lesson: a router that accepts any string will
 * silently route to a parameter that does not exist, and the user sees a
 * knob that moves nothing. Unknown destinations are refused with a
 * structured error, never dropped silently.
 *
 * The synth destinations mirror the voice classes' own param lists
 * (src/audio/voices/) — the voices are the single source; this registry
 * derives from them so the two can never diverge.
 */

import { POLYSYNTH_PARAMS } from '../audio/voices/PolySynth';
import type { PolySynthParam } from '../audio/voices/PolySynth';
import { NOISEMACHINE_PARAMS } from '../audio/voices/NoiseMachine';
import type { NoiseMachineParam } from '../audio/voices/NoiseMachine';
import { DRUM_PADS, DRUM_PARAMS } from '../audio/voices/DrumKit';
import type { DrumPad, DrumParam } from '../audio/voices/DrumKit';

export const SYNTH_ENGINES = ['polysynth', 'noisemachine', 'drumkit'] as const;
export type SynthEngine = (typeof SYNTH_ENGINES)[number];

/** Build `synth:param-<name>` destinations from the voices' own param lists. */
const paramDestinations = (names: readonly string[]) => names.map((n) => `synth:param-${n}`);

export const POLYSYNTH_DESTINATIONS = paramDestinations(POLYSYNTH_PARAMS) as `synth:param-${PolySynthParam}`[];
export const NOISEMACHINE_DESTINATIONS = paramDestinations(NOISEMACHINE_PARAMS) as `synth:param-${NoiseMachineParam}`[];

/** DrumKit is addressed `<pad>.<param>` (e.g. `kick.tune`). */
export const DRUMKIT_DESTINATIONS = DRUM_PADS.flatMap((pad) =>
  DRUM_PARAMS.map((p) => `synth:param-${pad}.${p}` as const),
) as `synth:param-${DrumPad}.${DrumParam}`[];

/** MIDI out destinations — one per channel. */
export const MIDI_OUT_DESTINATIONS = Array.from({ length: 16 }, (_, i) => `midi:out-${i}`);

/** OSC out destinations — the sidecar's address space. */
export const OSC_OUT_DESTINATIONS = ['osc:out-/p31/param'] as const;

/** WLED segment destinations — 0..15. */
export const WLED_DESTINATIONS = Array.from({ length: 16 }, (_, i) => `wled:seg-${i}`);

/** Every valid destination, as a Set for O(1) validation. */
export const ALL_DESTINATIONS = new Set<string>([
  ...POLYSYNTH_DESTINATIONS,
  ...NOISEMACHINE_DESTINATIONS,
  ...DRUMKIT_DESTINATIONS,
  ...MIDI_OUT_DESTINATIONS,
  ...OSC_OUT_DESTINATIONS,
  ...WLED_DESTINATIONS,
]);

export type DestinationKind = 'synth' | 'midi' | 'osc' | 'wled';

export function destinationKind(destination: string): DestinationKind | null {
  if (destination.startsWith('synth:')) return 'synth';
  if (destination.startsWith('midi:')) return 'midi';
  if (destination.startsWith('osc:')) return 'osc';
  if (destination.startsWith('wled:')) return 'wled';
  return null;
}

/** Is this a destination the router can route to? */
export function isKnownDestination(destination: string): boolean {
  return ALL_DESTINATIONS.has(destination);
}

/** The source grammar (mirrors the canon gate's SOURCE_RE). */
export const SOURCE_RE = /^(ui:control-[\w-]+|midi:in-\d+|osc:\/[\w\/.-]+|wled:sync)$/;

export function isKnownSource(source: string): boolean {
  return SOURCE_RE.test(source);
}

/** The display label for a destination — for the matrix UI. */
export function destinationLabel(destination: string): string {
  const idx = destination.indexOf(':');
  if (idx === -1) return destination;
  const kind = destination.slice(0, idx);
  const rest = destination.slice(idx + 1);
  switch (kind) {
    case 'synth':
      return rest.replace(/^param-/, '').replace(/\./g, ' · ');
    case 'midi':
      return `MIDI ${rest.replace(/^out-/, 'ch ')}`;
    case 'osc':
      return rest;
    case 'wled':
      return `WLED ${rest.replace(/^seg-/, 'seg ')}`;
    default:
      return destination;
  }
}