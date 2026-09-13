import { useEffect, useState, useCallback } from 'react';
import { useSandboxStore } from './features/sandbox';

import { CrisisOverlay, SpoonDial, Topbar, Button } from '@p31/design-core/compositions';
import SandboxPage from './pages/SandboxPage';
import CatalogPage from './pages/CatalogPage';
import { useSpoons } from './store/spoons';

function P31Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className={className} aria-hidden="true" fill="none">
      <path
        d="M12 2 L21 8.5 L12 22 L3 8.5 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 9 L21 8.5 L12 14 L3 8.5 Z"
        fill="var(--p31-void, Canvas)"
        opacity="0.55"
      />
    </svg>
  );
}

function TopbarSandboxActions({ onPopOut }: { onPopOut: () => void }) {
  const toggleSidebar = useSandboxStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useSandboxStore((s) => s.sidebarCollapsed);
  const artifactOpen = useSandboxStore((s) => s.artifactOpen);
  const toggleArtifact = useSandboxStore((s) => s.toggleArtifact);
  const spoons = useSpoons((s) => s.spoons);
  const setSpoons = useSpoons((s) => s.setSpoons);

  return (
    <div className="topbar-actions">
      <Button
        variant="ghost"
        size="sm"
        className="topbar-action topbar-action--icon"
        onClick={toggleSidebar}
        aria-pressed={!sidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="15" y2="18" />
        </svg>
      </Button>
      {artifactOpen && (
        <Button
          variant="ghost"
          size="sm"
          className="topbar-action topbar-action--icon"
          onClick={toggleArtifact}
          aria-pressed={artifactOpen}
          aria-label="Toggle artifact preview"
          title="Toggle artifact preview"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="topbar-action topbar-action--icon"
        onClick={onPopOut}
        aria-label="Open in new window"
        title="Open in new window"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </Button>
      <span className="topbar-divider" aria-hidden="true" />
      <span className="spoon-dial-frame">
        <SpoonDial
          level={spoons}
          onChange={(next) => setSpoons(next)}
        />
      </span>
    </div>
  );
}

export default function App() {
  const [isPopout, setIsPopout] = useState(false);
  const spoons = useSpoons((s) => s.spoons);
  const setSpoons = useSpoons((s) => s.setSpoons);
  const isDesign = typeof window !== 'undefined' && window.location.pathname.startsWith('/design');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('popout') === 'true') {
      setIsPopout(true);
    }
    document.documentElement.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  const crisis = spoons === 0;

  const openPopout = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('popout', 'true');
    const popup = window.open(url.toString(), '_blank', 'popup');
    if (popup) popup.focus();
  }, []);

  const switchRoute = (route: 'chat' | 'design') => {
    if (route === 'design') {
      window.location.href = '/design';
    } else {
      window.location.href = '/';
    }
  };

  if (isDesign) {
    return (
      <div className="app app--design">
        <nav className="design-nav" aria-label="Primary">
          <button
            className={`design-nav__tab ${window.location.pathname === '/design' ? 'design-nav__tab--active' : ''}`}
            onClick={() => switchRoute('design')}
            aria-current="page"
          >
            Design
          </button>
          <button
            className={`design-nav__tab ${!window.location.pathname.startsWith('/design') ? 'design-nav__tab--active' : ''}`}
            onClick={() => switchRoute('chat')}
          >
            Chat
          </button>
          <span className="design-nav__spoon">
            <SpoonDial level={spoons} onChange={(next) => setSpoons(next)} />
          </span>
        </nav>
        <CatalogPage />
      </div>
    );
  }

  return (
    <div className="app" data-container data-popout={isPopout}>
      {!isPopout && (
        <Topbar
          brand={
            <span className="app-brand">
              <P31Mark className="app-brand__mark" />
              <span className="app-brand__name">Sandbox</span>
              <span className="app-brand__sep" aria-hidden="true">·</span>
              <span className="app-brand__ctx">Component lab</span>
            </span>
          }
          right={<TopbarSandboxActions onPopOut={openPopout} />}
        />
      )}

      {crisis ? (
        <CrisisOverlay
          visible
          message="You look drained. Let's pause — deep breaths, water, and a quiet minute."
          buttonLabel="I rested"
          onReady={() => { useSpoons.getState().setSpoons(2); }}
        />
      ) : (
        <SandboxPage
          variant={isPopout ? 'popout' : 'page'}
        />
      )}
    </div>
  );
}