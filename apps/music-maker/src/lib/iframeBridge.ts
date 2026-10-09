/**
 * The music maker — iframe bridge.
 *
 * The instrument's collaborative surface when framed by QPJ. The PARENT pushes
 * identity, the resolved token palette, and the presence roster down over
 * postMessage; the instrument pushes `ready` and activity events up.
 *
 * The DO room stays the source of truth for the composition — this bridge is
 * the live identity/theme/activity hint, NOT the authoritative state path.
 *
 * Same-origin (sandbox="allow-scripts allow-same-origin") keeps every message
 * cheap; the '*' target keeps the protocol working even if the sandbox ever
 * drops allow-same-origin (an opaque origin would still deliver postMessage).
 *
 * This module is mirrored in QPJ (production/portals/qpj/src/lib/iframeBridge.ts)
 * and unit-tested on each side. Keep the two in sync.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface BridgeIdentity {
  pickledName: string;
  passportId: string;
  /** The player's current spoon level (0–5) — the instrument scales its
   *  gentleness from it. */
  spoons?: number;
}

export interface BridgeActivity {
  kind: 'trigger' | 'place' | 'clear';
  zone: string;
  author: string;
  at: number;
  /** The instrument's live zone count at emit time — a hint, not a ledger. */
  zones: number;
  /** The zone's placer, when known — the shell rewards playing a zone someone
   *  ELSE placed (collaboration, not solo grinding). */
  zoneAuthor?: string;
}

export type BridgeMessage =
  | { type: 'p31:identity'; pickledName: string; passportId: string; spoons?: number }
  | { type: 'p31:theme'; tokens: Record<string, string> }
  | { type: 'p31:roster'; present: BridgeIdentity[] }
  | { type: 'p31:ready' }
  | { type: 'p31:activity'; kind: BridgeActivity['kind']; zone: string; author: string; at: number; zones: number; zoneAuthor?: string };

export const BRIDGE_PREFIX = 'p31:';

/** Pure: is this a well-formed bridge message? (Unit-tested.) */
export function isBridgeMessage(data: unknown): data is BridgeMessage {
  if (typeof data !== 'object' || data === null) return false;
  const m = data as Record<string, unknown>;
  if (typeof m.type !== 'string') return false;
  if (m.type.length <= BRIDGE_PREFIX.length || !m.type.startsWith(BRIDGE_PREFIX)) return false;
  return true;
}

/** Pure: overlay resolved --p31-* tokens onto a root element, skipping any
 *  non-token keys a future sender might include. (Unit-tested.) */
export function applyThemeTokens(root: HTMLElement, tokens: Record<string, string>): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('--p31-')) root.style.setProperty(key, value);
  }
}

/** Send a message up to the parent shell. Standalone (the worker URL, no
 *  shell) this is a no-op — `window.parent === window`. */
export function sendToParent(msg: BridgeMessage): void {
  if (window.parent === window) return;
  try {
    window.parent.postMessage(msg, '*');
  } catch {
    // Opaque-origin guard — the message is a hint, never load-bearing.
  }
}

export interface BridgeState {
  identity: BridgeIdentity | null;
  roster: BridgeIdentity[];
  /** Report a local action to the shell (each device reports its own moves).
   *  `author` is this device's player; `zoneAuthor` is the zone's placer (for
   *  the collaboration-reward rule). */
  sendActivity: (kind: BridgeActivity['kind'], zone: string, zones: number, author?: string, zoneAuthor?: string) => void;
}

/** The instrument's side of the bridge. Listens for identity/theme/roster from
 *  the shell; announces itself on mount so the shell replies with state. */
export function useIframeBridge(): BridgeState {
  const [identity, setIdentity] = useState<BridgeIdentity | null>(null);
  const [roster, setRoster] = useState<BridgeIdentity[]>([]);
  const identityRef = useRef<BridgeIdentity | null>(null);
  identityRef.current = identity;

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (!isBridgeMessage(ev.data)) return;
      const msg = ev.data;
      if (msg.type === 'p31:identity') {
        setIdentity({
          pickledName: msg.pickledName,
          passportId: msg.passportId,
          spoons: typeof msg.spoons === 'number' ? msg.spoons : 3,
        });
      } else if (msg.type === 'p31:theme') {
        applyThemeTokens(document.documentElement, msg.tokens);
      } else if (msg.type === 'p31:roster') {
        setRoster(msg.present);
      }
    };
    window.addEventListener('message', onMessage);
    sendToParent({ type: 'p31:ready' });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const sendActivity = useCallback((
    kind: BridgeActivity['kind'],
    zone: string,
    zones: number,
    author?: string,
    zoneAuthor?: string,
  ) => {
    sendToParent({
      type: 'p31:activity',
      kind,
      zone,
      author: author ?? identityRef.current?.pickledName ?? 'someone',
      at: Date.now(),
      zones,
      ...(zoneAuthor ? { zoneAuthor } : {}),
    });
  }, []);

  return { identity, roster, sendActivity };
}