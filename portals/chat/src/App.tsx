import { useEffect, useState } from 'react';
import { useSandboxStore } from './features/sandbox';

import { CrisisOverlay, SpoonDial } from '@p31ca/design-core/compositions';
import SandboxPage from './pages/SandboxPage';
import CatalogPage from './pages/CatalogPage';
import AppStarfield from './components/AppStarfield';
import { useSpoons } from './store/spoons';

export default function App() {
  const [isPopout, setIsPopout] = useState(false);
  const spoons = useSpoons((s) => s.spoons);
  const setSpoons = useSpoons((s) => s.setSpoons);
  const reducedStimulation = useSandboxStore((s) => s.reducedStimulation);
  const isDesign = typeof window !== 'undefined' && window.location.pathname.startsWith('/design');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('popout') === 'true') {
      setIsPopout(true);
    }
    document.documentElement.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  useEffect(() => {
    const onPopout = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('popout', 'true');
      const popup = window.open(url.toString(), '_blank', 'popup');
      if (popup) popup.focus();
    };
    window.addEventListener('p31:popout', onPopout);
    return () => window.removeEventListener('p31:popout', onPopout);
  }, []);

  const crisis = spoons === 0;

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
      <AppStarfield enabled={!reducedStimulation && !isPopout} />

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