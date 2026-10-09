import { useEffect, useState } from 'react';
import { loadIdentity, ensureIdentity } from '@p31ca/shared-identity';
import { updateProfile } from '@p31ca/sovereign-core';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useSensoryStore } from '../store/useSensoryStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { logSpoonChange } from '../lib/spoonHistory';
import { NAV_ITEMS } from '../lib/navItems';
import { Topbar as CanonTopbar } from '@p31ca/ui/chrome';
import type { TopbarNavItem } from '@p31ca/ui/chrome';

export interface SpoonIconProps {
  children?: never;
}
function SpoonIcon() {
  return (
    <svg viewBox="0 0 200 200" width="16" height="16" aria-hidden="true">
      <path d="M100 30 Q96 80 100 110 Q100 120 100 145" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="145" rx="16" ry="26" fill="currentColor" />
      <circle cx="100" cy="30" r="6" fill="currentColor" />
    </svg>
  );
}

export default function Topbar() {
  const spoons = useAppStore((s) => s.spoons);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const did = useAppStore((s) => s.did);
  const mesh = useAppStore((s) => s.mesh);
  const setSpoons = useAppStore((s) => s.setSpoons);
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);
  const hubOpen = useShellStore((s) => s.hubOpen);
  const toggleHeaderDrawer = useShellStore((s) => s.toggleHeaderDrawer);
  const unreadCount = useShellStore((s) => s.unreadCount);
  const notifications = useShellStore((s) => s.notifications);
  const focus = useSensoryStore((s) => s.focus);
  const undoCount = useHistoryStore((s) => s.entries.length);
  const undo = useHistoryStore((s) => s.undo);

  const [showInstall, setShowInstall] = useState(false);
  const [pendingOutbox, setPendingOutbox] = useState(0);
  const [deviceDid, setDeviceDid] = useState<string | null>(null);

  useEffect(() => {
    try {
      const identity = loadIdentity();
      if (identity?.did) setDeviceDid(identity.did);
    } catch {
      // no identity on this device — keep showing "Sign In"
    }
  }, []);

  const handleConnect = async () => {
    try {
      const result = await ensureIdentity();
      const resolved = result?.identity?.did || loadIdentity()?.did || null;
      if (resolved) {
        setDeviceDid(resolved);
        useAppStore.setState({ did: resolved });
        try {
          updateProfile({ did: resolved });
        } catch {
          // profile persistence is best-effort
        }
      }
    } catch {
      // identity generation unavailable — stay on "Sign In"
    }
    setTab('profile');
  };

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone;
    if (!isStandalone && (window as any).__p31_installPrompt) {
      setShowInstall(true);
    }
    const mql = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setShowInstall(false);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const updatePending = async () => {
      try {
        const { getPendingCount } = await import('../lib/outbox');
        const count = await getPendingCount();
        setPendingOutbox(count);
      } catch {
        // outbox not initialized yet
      }
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInstall = () => {
    const prompt = (window as any).__p31_installPrompt;
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then(() => setShowInstall(false));
    }
  };

  function nodeCount(nodes: unknown): number {
    if (!nodes) return 0;
    if (nodes instanceof Map) return nodes.size;
    if (Array.isArray(nodes)) return nodes.length;
    return Object.keys(nodes as Record<string, unknown>).length;
  }

  const peers = nodeCount(mesh?.nodes) - (mesh?.localDid ? 1 : 0);
  const badgeCount = focus
    ? notifications.filter((n) => !n.read && n.priority === 'high').length
    : unreadCount;

  const navItems: TopbarNavItem[] = NAV_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    onSelect: (key) => setTab(key as typeof tab),
  }));

  const setSpoonsWithLog = (level: number) => {
    setSpoons(level);
    logSpoonChange(level, level === 0 ? 'dial-rest' : 'dial').catch(() => {});
    window.dispatchEvent(new CustomEvent('p31:shell-spoons', { detail: level }));
  };

  const slotLeft = (
    <>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => setTab('sandbox')}
        aria-label="MCP Explorer"
        title="MCP Explorer — tools and agents"
      >
        <span aria-hidden="true">🔌</span>
      </button>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => setTab('dashboard')}
        aria-label="Mesh Status"
        title="Mesh Status — fleet health"
      >
        <span aria-hidden="true">🌐</span>
      </button>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => setTab('commandHub')}
        aria-label="Command Hub"
        title="Command Hub — unified service control plane"
      >
        <span aria-hidden="true">🧭</span>
      </button>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => {
          (window as unknown as { __p31Shell?: { openHub?: () => void } }).__p31Shell?.openHub?.();
        }}
        aria-label="Notifications"
        aria-expanded={hubOpen}
        title="Alerts"
      >
        <span aria-hidden="true">🔔</span>
        {badgeCount > 0 && <span className="badge-mini">{badgeCount}</span>}
      </button>
    </>
  );

  const slotCenter = (
    <>
      <span className="metric-badge" title="LOVE balance">
        💎 <strong>{loveBalance?.availableBalance ?? '—'}</strong>
      </span>
      <span className="metric-badge" title="Mesh peers online">
        <span className="status-dot" aria-hidden="true" /> {peers} peers
      </span>
      {did && (
        <span className="metric-badge did" title={did}>
          {did.slice(0, 10)}…
        </span>
      )}
    </>
  );

  const slotRight = (
    <>
      {deviceDid ? (
        <button
          type="button"
          className="metric-badge clickable did"
          onClick={() => setTab('profile')}
          title={`Connected as device DID: ${deviceDid} — open Profile`}
          style={{ color: 'var(--p31-accent)' }}
        >
          <span aria-hidden="true">🔑</span> {`${deviceDid.slice(0, 8)}…${deviceDid.slice(-6)}`}
        </button>
      ) : (
        <button
          type="button"
          className="metric-badge clickable"
          onClick={handleConnect}
          title="Create your ownable DID:key identity"
        >
          Sign&nbsp;In
        </button>
      )}
      {undoCount > 0 && (
        <button
          type="button"
          className="metric-badge clickable"
          onClick={undo}
          title={`Undo last change (⌘Z) — ${useHistoryStore.getState().entries[useHistoryStore.getState().entries.length - 1]?.label ?? ''}`}
        >
          ↩ Undo
        </button>
      )}
      {pendingOutbox > 0 && (
        <span
          className="metric-badge offline-badge"
          title={`${pendingOutbox} pending write${pendingOutbox > 1 ? 's' : ''} (will sync when online)`}
        >
          ⏳ {pendingOutbox}
        </span>
      )}
      {showInstall && (
        <button type="button" className="metric-badge clickable" onClick={handleInstall} title="Install App">
          ⬇️ Install App
        </button>
      )}
      <button
        type="button"
        className="metric-badge clickable palette-trigger"
        onClick={() => useShellStore.getState().setPaletteOpen(true)}
        title="Command palette (⌘K)"
      >
        ⌘K
        {badgeCount > 0 && <span className="badge-mini">{badgeCount}</span>}
      </button>
    </>
  );

  return (
    <CanonTopbar
      navItems={navItems}
      brand="Ⓟ31"
      brandLabel="P31 Sovereign Shell"
      spoons={spoons}
      setSpoons={setSpoonsWithLog}
      activeKey={tab}
      slotLeft={slotLeft}
      slotCenter={slotCenter}
      slotRight={slotRight}
      notificationsBadgeCount={badgeCount}
    />
  );
}
