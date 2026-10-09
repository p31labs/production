/**
 * The pure routing logic.
 *
 * Everything here is a pure function — no DOM, no WebSocket, no React. The
 * router decides whether a (source, destination) pair is valid and what
 * happens to an incoming move. The ControlRoom DO does the actual fan-out;
 * this module is what the UI uses to pre-validate before committing, so a
 * user never sees a silent failure.
 *
 * The one-to-one rule (MVP): a source drives one destination, a destination
 * accepts one source. Fan-out is a later unlock. This mirrors the canon
 * gate's bidirectional routing fold.
 */

import { isKnownDestination, isKnownSource, destinationKind, type DestinationKind } from './controlRegistry';

export interface Mapping {
  source: string;
  destination: string;
  mapping: Record<string, unknown>;
}

export interface RouteResult {
  ok: boolean;
  /** A structured refusal reason — never a bare boolean. */
  code?:
    | 'INVALID_SOURCE'
    | 'INVALID_DESTINATION'
    | 'SOURCE_TAKEN'
    | 'DESTINATION_TAKEN'
    | 'DESTINATION_CAP'
    | 'SELF_ROUTE';
  message?: string;
}

/** The destination budget (§1.5) — refuse past this. */
export const MAX_DESTINATIONS = 64;

/**
 * Validate a proposed mapping against the current routing table.
 *
 * `mappings` is the committed list (from the snapshot). The function is
 * pure — it does not mutate. Returns a structured result so the UI can show
 * the exact reason a bind was refused.
 */
export function validateMapping(
  proposed: { source: string; destination: string },
  mappings: ReadonlyArray<Mapping>,
): RouteResult {
  if (!isKnownSource(proposed.source)) {
    return { ok: false, code: 'INVALID_SOURCE', message: `'${proposed.source}' is not a valid source` };
  }
  if (!isKnownDestination(proposed.destination)) {
    return {
      ok: false,
      code: 'INVALID_DESTINATION',
      message: `'${proposed.destination}' is not a known destination — refusing rather than routing to a parameter that does not exist`,
    };
  }

  const existingDest = mappings.find((m) => m.destination === proposed.destination);
  if (existingDest && existingDest.source !== proposed.source) {
    return {
      ok: false,
      code: 'DESTINATION_TAKEN',
      message: `'${proposed.destination}' is already bound to '${existingDest.source}'`,
    };
  }
  const existingSource = mappings.find((m) => m.source === proposed.source);
  if (existingSource && existingSource.destination !== proposed.destination) {
    return {
      ok: false,
      code: 'SOURCE_TAKEN',
      message: `'${proposed.source}' is already bound to '${existingSource.destination}'`,
    };
  }
  if (
    mappings.length >= MAX_DESTINATIONS &&
    !mappings.some((m) => m.destination === proposed.destination)
  ) {
    return {
      ok: false,
      code: 'DESTINATION_CAP',
      message: `the ${MAX_DESTINATIONS}-destination budget is full`,
    };
  }
  return { ok: true };
}

/**
 * Apply a committed mapping.set to a mapping list. Pure — returns a new
 * array. The one-to-one replacement is exact: setting a pair replaces the
 * destination's previous binding and clears the source's previous binding,
 * so the table never holds a duplicate.
 */
export function applyMappingSet(
  mappings: ReadonlyArray<Mapping>,
  next: Mapping,
): Mapping[] {
  const filtered = mappings.filter(
    (m) => m.destination !== next.destination && m.source !== next.source,
  );
  return [...filtered, next];
}

/** Apply a committed mapping.clear. Only the exact pair unbinds. */
export function applyMappingClear(
  mappings: ReadonlyArray<Mapping>,
  pair: { source: string; destination: string },
): Mapping[] {
  return mappings.filter(
    (m) => !(m.source === pair.source && m.destination === pair.destination),
  );
}

/** Group mappings by destination kind — for the matrix UI's row grouping. */
export function groupByKind(mappings: ReadonlyArray<Mapping>): Record<DestinationKind, Mapping[]> {
  const out: Record<DestinationKind, Mapping[]> = {
    synth: [],
    midi: [],
    osc: [],
    wled: [],
  };
  for (const m of mappings) {
    const kind = destinationKind(m.destination);
    if (kind) out[kind].push(m);
  }
  return out;
}

/**
 * The ephemeral frame the UI sends for a control move. The DO routes it by
 * source; this is what a Knob's onChange becomes.
 */
export interface ControlFrame {
  type: 'control';
  source: string;
  value: number;
  cc?: number;
}

export function toControlFrame(source: string, value: number, cc?: number): ControlFrame {
  return { type: 'control', source, value, ...(cc !== undefined ? { cc } : {}) };
}