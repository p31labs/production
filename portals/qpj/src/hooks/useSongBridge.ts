/**
 * QPJ — useSongBridge: the parent side of the song iframe bridge.
 *
 * Pushes identity, the resolved token palette, and the online roster down to
 * the instrument over postMessage (it cannot read QPJ's store or inline theme
 * from inside the sandboxed frame); listens for `ready` and activity events up.
 *
 * The shell reflects activity in the song__live line. The DO room remains the
 * source of truth for the composition — the bridge is a live hint, and this
 * hook never persists anything through it.
 */
import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import {
  activityLabel,
  isBridgeMessage,
  readShellTokens,
  sendToChild,
  type BridgeMessage,
} from '../lib/iframeBridge';
import { constellationMilestoneHit, musicReward, CONSTELLATION_THRESHOLDS } from '../lib/love';

export interface SongBridge {
  /** The live line shown under the song header, e.g. "3 zones · Dillpickle played the sun". */
  live: string | null;
  /** Re-send current state into the frame (used on iframe onLoad). */
  ping: () => void;
}

export function useSongBridge(iframeRef: RefObject<HTMLIFrameElement | null>): SongBridge {
  const [live, setLive] = useState<string | null>(null);

  // Snapshot of the online roster — a stable selector the effect can depend on
  // without re-sending on every mesh heartbeat.
  const onlineRosterKey = useQpjStore((s) =>
    Object.entries(s.presence)
      .filter(([, node]) => node.online)
      .map(([id]) => id)
      .sort()
      .join(','),
  );

  const sendState = useCallback(() => {
    const iframe = iframeRef.current;
    const { passportId, presence, spoons } = useQpjStore.getState();
    const me = getPassport(passportId);
    sendToChild(iframe, { type: 'p31:identity', pickledName: me.pickledName, passportId, spoons });
    sendToChild(iframe, { type: 'p31:theme', tokens: readShellTokens() });
    const present = Object.entries(presence)
      .filter(([, node]) => node.online)
      .map(([id]) => ({ pickledName: getPassport(id).pickledName, passportId: id }));
    sendToChild(iframe, { type: 'p31:roster', present });
  }, [iframeRef]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (!isBridgeMessage(ev.data)) return;
      const msg = ev.data as BridgeMessage;
      if (msg.type === 'p31:ready') {
        // The instrument is up — hand it our current state and reset the line.
        sendState();
        setLive(null);
      } else if (msg.type === 'p31:activity') {
        setLive(activityLabel(msg));
        rewardActivity(msg);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendState]);

  // ── Ethical gamification (collaboration rewards, not points) ──────────────
  // Playing a zone someone ELSE placed earns LOVE, gated by the anti-farm caps
  // (per-session max, per-zone cooldown, spoons floor). Crossing a constellation
  // threshold (4/8/12/16 zones) pops a milestone + a treat. The reward is
  // decided HERE (the shell owns the ledger); the instrument only reports
  // honest activity.
  const rewardActivity = useCallback((msg: Extract<BridgeMessage, { type: 'p31:activity' }>) => {
    const store = useQpjStore.getState();
    const me = getPassport(store.passportId);
    if (msg.author !== me.pickledName) return; // only MY device's activity earns for me
    const now = Date.now();

    if (msg.kind === 'trigger' && msg.zoneAuthor && msg.zoneAuthor !== me.pickledName) {
      const amount = musicReward(store.love.log, me.pickledName, msg.zone, store.spoons, now);
      if (amount > 0) store.earnLove('music', me.pickledName);
    } else if (msg.kind === 'place') {
      // Monotonic across reloads: derive the last awarded threshold from the
      // milestone entries this user has earned (one per crossing).
      const earned = store.love.log.filter((e) => e.source === 'milestone' && e.kind === 'earn' && e.by === me.pickledName).length;
      const lastAwarded = earned > 0 ? CONSTELLATION_THRESHOLDS[earned - 1] ?? 0 : 0;
      const hit = constellationMilestoneHit(msg.zones, lastAwarded);
      if (hit > 0) {
        store.earnLove('milestone', me.pickledName);
        store.addTreats(1);
        setLive(`${me.pickledName} built a sky together — it’s brighter now`);
      }
    }
  }, []);

  // Re-send when identity or the online roster changes (identity is constant
  // per route render, roster changes on mesh joins/leaves).
  useEffect(() => {
    sendState();
  }, [sendState, onlineRosterKey]);

  // Re-send when the theme/pack changes. QPJ re-asserts its pack tokens via a
  // microtask after the theme store fires; a macrotask lets that land before we
  // read the computed values.
  useEffect(() => {
    return useThemeStore.subscribe(() => {
      setTimeout(sendState, 0);
    });
  }, [sendState]);

  const ping = useCallback(() => sendState(), [sendState]);

  return { live, ping };
}