/**
 * QPJ → instrument iframe bridge (the PARENT side of the protocol mirror).
 *
 * The instrument app (apps/music-maker, served same-origin at /song.html)
 * ships the same message shapes. Both trees keep this module in sync; each is
 * unit-tested on its own side.
 *
 * The sandbox is the collaboration boundary in the crash-isolation sense: the
 * instrument gets its own JS heap, WebGL context, and audio context inside
 * sandbox="allow-scripts allow-same-origin", so one device's instrument crash
 * never takes down the parent shell. The DO room remains the source of truth
 * for the composition — this bridge is the live identity/theme/activity hint,
 * NOT the authoritative state path.
 */
export interface BridgeIdentity {
  pickledName: string;
  passportId: string;
  /** The player's current spoon level (0–5) — the instrument scales its
   *  gentleness from it. */
  spoons?: number;
}

export type BridgeMessage =
  | { type: 'p31:identity'; pickledName: string; passportId: string; spoons?: number }
  | { type: 'p31:theme'; tokens: Record<string, string> }
  | { type: 'p31:roster'; present: BridgeIdentity[] }
  | { type: 'p31:ready' }
  | { type: 'p31:activity'; kind: 'trigger' | 'place' | 'clear'; zone: string; author: string; at: number; zones: number; zoneAuthor?: string };

export const BRIDGE_PREFIX = 'p31:';

/** Pure: is this a well-formed bridge message? (Unit-tested.) */
export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (typeof data !== 'object' || data === null) return false;
  const m = data as Record<string, unknown>;
  if (typeof m.type !== 'string') return false;
  if (m.type.length <= BRIDGE_PREFIX.length || !m.type.startsWith(BRIDGE_PREFIX)) return false;
  return true;
}

/** The color surface the instrument reads (music-maker's full --p31-* reads
 *  minus the structural spacing/radius/touch/z tokens, which keep the canon's
 *  own defaults). The shell resolves these from ITS live computed style so the
 *  instrument wears the shell's exact palette, values not theme names. */
export const THEME_TOKENS = [
  '--p31-accent',
  '--p31-accent-gold',
  '--p31-accent-green',
  '--p31-accent-red',
  '--p31-bg',
  '--p31-glass-bg',
  '--p31-glass-border',
  '--p31-starfield-hearth',
  '--p31-starfield-particle-coral',
  '--p31-starfield-remembrance',
  '--p31-starfield-teal',
  '--p31-surface',
  '--p31-text',
  '--p31-text-secondary',
  '--p31-text-tertiary',
];

/** Resolve the shell's current token values. QPJ applies its pack via inline
 *  setProperty on the root, so getComputedStyle reads exactly what the user
 *  chose (Space dark / Lantern cream / Chameleon worlds). */
export function readShellTokens(root?: HTMLElement): Record<string, string> {
  const el = root ?? document.documentElement;
  const cs = getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const key of THEME_TOKENS) {
    const value = cs.getPropertyValue(key).trim();
    if (value) out[key] = value;
  }
  return out;
}

/** Pure: the shell's one-line live copy for an activity event. */
export function activityLabel(m: Extract<BridgeMessage, { type: 'p31:activity' }>): string {
  const who = m.author && m.author !== 'someone' ? m.author : 'someone';
  const act =
    m.kind === 'trigger'
      ? m.zone
        ? `played ${m.zone}`
        : 'played a sound'
      : m.kind === 'place'
        ? 'placed a zone'
        : 'cleared a zone';
  return `${m.zones} zones · ${who} ${act}`;
}

/** Send a message down into the instrument's frame. */
export function sendToChild(iframe: HTMLIFrameElement | null, msg: BridgeMessage): void {
  if (!iframe?.contentWindow) return;
  try {
    iframe.contentWindow.postMessage(msg, '*');
  } catch {
    // Opaque-origin guard — the bridge is a hint, never load-bearing.
  }
}