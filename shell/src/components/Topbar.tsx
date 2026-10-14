import { useEffect, useState } from 'react';
import { loadIdentity, ensureIdentity } from '@p31ca/shared-identity';
import { updateProfile } from '@p31ca/sovereign-core';
import { Topbar as CanonTopbar, SpoonDial } from '@p31ca/design-core/compositions';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useSensoryStore } from '../store/useSensoryStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { logSpoonChange } from '../lib/spoonHistory';
import { NAV_ITEMS } from '../lib/navItems';

/**
 * Topbar — the ONE professional-clean topbar for the sovereign shell.
 *
 * Contract (runbook §8):
 *  - 3–7 primary nav items (5 here: home · bonding · dashboard · sandbox ·
 *    cockpit); every other destination collapses into the "more" menu.
 *  - ≤5 action icons (3 here: notifications, ⌘K palette, more); secondary
 *    actions (undo, install, outbox) live in the more menu.
 *  - Sticky (`position: sticky` via `.topbar--sticky` in shell CSS) with
 *    `html { scroll-padding-top: var(--p31-header-height) }`.
 *  - Rendered ONCE in the persistent `.shell` wrapper div (App.tsx) — never
 *    re-mounted per tab, so state and listeners survive navigation.
 *  - Composed from canon: @p31ca/design-core slot Topbar + SpoonDial. The
 *    shell supplies geometry only (shell owns geometry; canon owns look).
 */

/** Primary destinations (3–7 per the contract). The rest fold into "more". */
const PRIMARY_NAV_KEYS = ['home', 'bonding', 'dashboard', 'sandbox', 'cockpit'] as const;

const PRIMARY_NAV = NAV_ITEMS.filter((item) =>
  (PRIMARY_NAV_KEYS as readonly string[]).includes(item.key),
);
const MORE_NAV = NAV_ITEMS.filter(
  (item) => !(PRIMARY_NAV_KEYS as readonly string[]).includes(item.key),
);

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
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    try {
      const identity = loadIdentity();
      if (identity?.did) setDeviceDid(identity.did);
    } catch {
      // no identity on this device — keep showing "Sign In"
    }
  }, []);

  // The more menu closes on outside press / Escape; listeners live for the
  // component's lifetime (the topbar never unmounts — it persists on the
  // wrapper div), so no cross-navigation teardown is needed.
  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      const menu = document.getElementById('topbar-more-menu');
      if (menu && !menu.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

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

  const setSpoonsWithLog = (level: number) => {
    setSpoons(level);
    logSpoonChange(level, level === 0 ? 'dial-rest' : 'dial').catch(() => {});
    window.dispatchEvent(new CustomEvent('p31:shell-spoons', { detail: level }));
  };

  const selectTab = (key: string) => {
    setTab(key as typeof tab);
    setMoreOpen(false);
  };

  const brand = (
    <button
      type="button"
      className="topbar-brand"
      onClick={() => setTab('home')}
      aria-label="P31 Sovereign Shell — Home"
    >
      <span aria-hidden="true">Ⓟ31</span>
      <span>P31 Sovereign Shell</span>
    </button>
  );

  const center = (
    <nav className="topbar-nav" aria-label="Primary">
      {PRIMARY_NAV.map((item) => {
        const active = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`topbar-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => selectTab(item.key)}
          >
            <span className="topbar-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const statusCluster = (
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

  const trailing = (
    <>
      <SpoonDial level={spoons} onChange={setSpoonsWithLog} className="topbar-spoons" />
      <button
        type="button"
        className="topbar-icon-btn"
        aria-label="Notifications"
        aria-expanded={hubOpen}
        title="Alerts"
        onClick={toggleHeaderDrawer}
      >
        <span aria-hidden="true">🔔</span>
        {badgeCount > 0 && <span className="badge-mini">{badgeCount}</span>}
      </button>
      <button
        type="button"
        className="topbar-icon-btn palette-trigger"
        onClick={() => useShellStore.getState().setPaletteOpen(true)}
        title="Command palette (⌘K)"
        aria-label="Command palette (⌘K)"
      >
        <span aria-hidden="true">⌘K</span>
        {badgeCount > 0 && <span className="badge-mini">{badgeCount}</span>}
      </button>
      <div className="topbar-more">
        <button
          type="button"
          className="topbar-icon-btn"
          aria-haspopup="true"
          aria-expanded={moreOpen}
          aria-controls="topbar-more-menu"
          aria-label="More"
          title="More"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span aria-hidden="true">⋯</span>
        </button>
        {moreOpen && (
          <div id="topbar-more-menu" className="topbar-more-menu" role="group" aria-label="More">
            <div className="topbar-more-menu__label">Destinations</div>
            {MORE_NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`topbar-more-menu__item${tab === item.key ? ' active' : ''}`}
                aria-current={tab === item.key ? 'page' : undefined}
                onClick={() => selectTab(item.key)}
              >
                <span aria-hidden="true">{item.icon}</span> {item.label}
              </button>
            ))}
            {pendingOutbox > 0 && (
              <div
                className="topbar-more-menu__status"
                title={`${pendingOutbox} pending write${pendingOutbox > 1 ? 's' : ''} (will sync when online)`}
              >
                ⏳ {pendingOutbox} pending
              </div>
            )}
            {undoCount > 0 && (
              <button
                type="button"
                className="topbar-more-menu__item"
                onClick={() => {
                  undo();
                  setMoreOpen(false);
                }}
                title={`Undo last change (⌘Z) — ${useHistoryStore.getState().entries[useHistoryStore.getState().entries.length - 1]?.label ?? ''}`}
              >
                ↩ Undo
              </button>
            )}
            {showInstall && (
              <button type="button" className="topbar-more-menu__item" onClick={handleInstall} title="Install App">
                ⬇️ Install App
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  const identity = deviceDid ? (
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
  );

  return (
    <CanonTopbar
      glass={false}
      brand={brand}
      center={center}
      statusCluster={statusCluster}
      trailing={trailing}
      identity={identity}
      aria-label="Sovereign shell top bar"
    />
  );
}