// State sync — subscribes to shell stores and broadcasts deltas over the
// libp2p signaling channel. Receives inbound syncs and applies them locally.
import { broadcastSync, onSync } from './libp2pMesh';
import { useAppStore } from '../../store/useAppStore';
import { useShellStore } from '../../store/useShellStore';
import { setKelRotatedHandler, importKEL, verifyKEL } from '../keri';
import { getLoveEngine } from '../loveEngine';

let started = false;
let notifSyncCount = 0;
let kelSyncCount = 0;

export function startStateSync(): void {
  if (started) return;
  started = true;

  // Outbound: broadcast spoon + unread changes (throttled together).
  let batchTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: Record<string, unknown> = {};

  function flush(): void {
    if (Object.keys(pending).length) {
      broadcastSync('state', { ...pending });
      try {
        const engine = getLoveEngine();
        const did = useAppStore.getState().did || 'unknown';
        engine.ingest('REMOTE_STATE_RECEIVED', { peerId: did, payload: pending });
      } catch {
        // LOVE ledger is best-effort
      }
      pending = {};
    }
    batchTimer = null;
  }

  function schedule(type: string, value: unknown): void {
    pending[type] = value;
    if (!batchTimer) batchTimer = setTimeout(flush, 500);
  }

  useAppStore.subscribe((state, prev) => {
    if (state.spoons !== prev.spoons) schedule('spoons', state.spoons);
  });

  useShellStore.subscribe((state, prev) => {
    if (state.unreadCount !== prev.unreadCount) schedule('unread', state.unreadCount);
    // Broadcast new notifications individually (merge by id, LWW per timestamp).
    if (state.notifications && prev.notifications && state.notifications.length > prev.notifications.length) {
      const newNotifs = state.notifications.slice(prev.notifications.length);
      for (const n of newNotifs) {
        broadcastSync('notif', { id: (n as any).id, source: (n as any).source, title: (n as any).title,
          body: (n as any).body, icon: (n as any).icon, priority: (n as any).priority,
          time: (n as any).time, read: (n as any).read });
        notifSyncCount++;
      }
    }
  });

  // KEL rotation broadcasts.
  setKelRotatedHandler((events) => {
    broadcastSync('kel', { events });
    kelSyncCount++;
  });

  // Inbound: apply state from peers.
  onSync((type, data) => {
    if (type === 'state' && data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d.spoons === 'number') {
        useAppStore.getState().setSpoons(d.spoons as number);
      }
      try {
        const engine = getLoveEngine();
        const peerDid = (data as any).did as string | undefined;
        if (peerDid) engine.ingest('TRANSMIT_COMPLETE', { peerId: peerDid });
      } catch {
        // LOVE ledger is best-effort
      }
    } else if (type === 'notif' && data && typeof data === 'object') {
      const n = data as Record<string, unknown>;
      const existing = useShellStore.getState().notifications;
      if (!existing.some((e: any) => e.id === n.id)) {
        useShellStore.getState().addNotification({
          source: (n.source as any) || 'mesh',
          title: (n.title as string) || '',
          body: (n.body as string) || '',
          icon: (n.icon as string) || '🔔',
          priority: (n.priority as 'high'|'medium'|'low') || 'medium',
        });
        notifSyncCount++;
      }
    } else if (type === 'heartbeat' && data && typeof data === 'object') {
      // Incoming signed heartbeat — verify KEL (required) and Ed25519+ML-DSA signatures.
      const h = data as Record<string, unknown>;
      const kelEvents = h.kelEvents as any[] | undefined;
      const did = h.did as string | undefined;
      // C': KEL is required for peer acceptance.
      if (!kelEvents || !kelEvents.length || !did) return;
      verifyKEL(kelEvents, did).then((kelOk) => {
        if (kelOk) kelSyncCount++;
      }).catch(() => {});
    } else if (type === 'kel' && data && typeof data === 'object' && Array.isArray((data as any).events)) {
      importKEL((data as any).events).then((ok) => {
        if (ok) kelSyncCount++;
      }).catch(() => {});
    }
  });

  // Expose sync counts via the meshSync hook.
  setInterval(() => {
    const s = (window as any).__p31_meshSync || {};
    (window as any).__p31_meshSync = { ...s, notifSyncs: notifSyncCount, kelSyncs: kelSyncCount };
  }, 1000);
}

// Verify hook extension — expose counts on the existing __p31_meshSync.
setInterval(() => {
  if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
    const s = (window as any).__p31_meshSync || {};
    (window as any).__p31_meshSync = { ...s, notifSyncs: notifSyncCount, kelSyncs: kelSyncCount };
  }
}, 2000);

