import { useEffect, lazy, Suspense, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { useShellStore } from './store/useShellStore';
import { useSensoryStore } from './store/useSensoryStore';
import { useEffectsStore } from './store/useEffectsStore';
import { logSpoonChange } from './lib/spoonHistory';
import { useRegisterShellMCP } from './hooks/useRegisterShellMCP';
import { useWebMCP } from './hooks/useWebMCP';
import { useNotificationHub } from './hooks/useNotificationHub';
import { useShellKeyboard } from './hooks/useShellKeyboard';
import { useOutboxDrain } from './hooks/useOutboxDrain';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import { useVerifyHooks } from './hooks/useVerifyHooks';
import { useSensorySync } from './hooks/useSensorySync';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useSpoonForecast } from './hooks/useSpoonForecast';
import { useSwipeNav } from './hooks/useSwipeNav';
import { useDoubleTapAssistant } from './hooks/useDoubleTapAssistant';
import { createCrossAppState } from './hooks/useCrossAppState';
import { initSovereignBridge, dispatchSovereignSpoons, dispatchSovereignCoherence } from '@p31ca/sovereign-core/bridge';
import { StarfieldBackground } from '@p31ca/shell-chrome';
import PocketCard from './components/PocketCard';

function vibrate(duration = 10): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(duration);
}

// Eager imports (always needed)
import Topbar from './components/Topbar';
import CommandPalette from './components/CommandPalette';
import RestOverlay from './components/RestOverlay';
import Toast from './components/Toast';
import FloatingWindow from './components/FloatingWindow';
import ArtifactPane from './features/sandbox/ArtifactPane';

// Lazy-loaded panels (loaded on demand)
const AssistantPanel = lazy(() => import('./components/AssistantPanel'));
const AkinatorPanel = lazy(() => import('./components/AkinatorPanel'));
const MeshStatusPanel = lazy(() => import('./components/MeshStatusPanel'));
const NodeZeroPanel = lazy(() => import('./components/NodeZeroPanel'));
const JusticePanel = lazy(() => import('./components/JusticePanel'));
const SBTPanel = lazy(() => import('./components/SBTPanel'));
const MarketplacePanel = lazy(() => import('./components/MarketplacePanel'));
const McpExplorer = lazy(() => import('./components/McpExplorer'));
const MemberDashboard = lazy(() => import('./components/MemberDashboard'));
const NotificationHub = lazy(() => import('./components/NotificationHub'));
const InsightsPanel = lazy(() => import('./features/insights/InsightsPanel'));

// Lazy-loaded pages (loaded on tab switch)
const SandboxPage = lazy(() => import('./pages/SandboxPage'));
const CockpitView = lazy(() => import('./components/CockpitView'));
const ResearchPage = lazy(() => import('./pages/ResearchPage'));
const BondingSurface = lazy(() => import('./features/bonding/BondingSurface'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GameSurface = lazy(() => import('./features/game/GameSurface'));
const CommandHub = lazy(() => import('./pages/CommandHub'));
const MonetizationPage = lazy(() => import('./pages/MonetizationPage'));

export default function App() {
  const spoons = useAppStore((s) => s.spoons);
  const tab = useAppStore((s) => s.tab);
  const ui = useAppStore((s) => s.ui);
  const setSpoons = useAppStore((s) => s.setSpoons);
  const setUi = useAppStore((s) => s.setUi);
  const showToast = useAppStore((s) => s.showToast);
  const sandboxOpen = useShellStore((s) => s.sandboxOpen);
  const setSandboxOpen = useShellStore((s) => s.setSandboxOpen);
  const lastNotifPulse = useShellStore((s) => s.lastNotifPulse);
  const unreadCount = useShellStore((s) => s.unreadCount);
  const calm = useSensoryStore((s) => s.calm);
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const effects = useEffectsStore();
  const floatingTriggerRef = useRef<HTMLButtonElement | null>(null);

  useAppBootstrap();
  const { updateReady, handleSwUpdate } = usePwaUpdate();
  useRegisterShellMCP();
  useWebMCP();
  useNotificationHub();
  useShellKeyboard();
  useOutboxDrain();
  useVerifyHooks();
  useSensorySync();
  useUndoHistory();
  useSpoonForecast();
  useSwipeNav();
  useDoubleTapAssistant();
  createCrossAppState();

  useEffect(() => {
    const cleanup = initSovereignBridge({
      onSpoonsChange: (spoons) => {
        useAppStore.getState().setSpoons(spoons);
      },
      onCoherenceChange: (coherence) => {
        // Shell doesn't store coherence yet — log for now
        console.log('[bridge] coherence:', coherence);
      },
    });
    return () => cleanup?.();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, [role="tab"], [role="button"]')) {
        vibrate(10);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleCrisisDismiss = () => {
    setSpoons(2);
    logSpoonChange(2, 'crisis-dismiss').catch(() => showToast('Spoon log failed', 'error'));
    setUi({ showCrisis: false, showBreak: false });
    showToast('🌿 You\'re back', 'success');
  };

  const renderTab = () => {
    switch (tab) {
      case 'home':
        return <CommandHub />;
      case 'bonding':
        return <BondingSurface />;
      case 'dashboard':
        return <DashboardPage />;
      case 'sandbox':
        return <SandboxPage floatingTriggerRef={floatingTriggerRef} />;
      case 'cockpit':
        return <CockpitView />;
      case 'profile':
        return <ProfilePage />;
      case 'research':
        return <ResearchPage />;
      case 'game':
        return <GameSurface />;
      case 'commandHub':
        return <CommandHub />;
      case 'monetization':
        return <MonetizationPage />;
      default:
        return (
          <div className="tab-placeholder">
            <span className="tab-placeholder-icon">🚧</span>
            <h2>{tab}</h2>
            <p>This surface will be ported into the shell next.</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="shell" data-spoons={spoons}>
        <a className="skip-link" href="#main">Skip to main content</a>
        <StarfieldBackground
          spoons={spoons}
          urgent={unreadCount > 0}
          pulseAt={lastNotifPulse}
          reduceMotion={reduceMotion}
          starDensity={effects.starDensity}
          starSpeed={effects.starSpeed}
          warmStars={effects.warmStars}
          domeAccent={effects.domeAccent}
          cometTrails={effects.cometTrails}
          aurora={effects.aurora}
          quantum={effects.quantum}
        />
        <Topbar />
        <main className="viewport" id="main">
          <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
            {renderTab()}
          </Suspense>
        </main>
        <CommandPalette />
        <Suspense fallback={null}>
          <AssistantPanel />
          <AkinatorPanel />
          <MeshStatusPanel />
          <NodeZeroPanel />
          <JusticePanel />
          <SBTPanel />
          <MarketplacePanel />
          <McpExplorer />
          <MemberDashboard />
          <NotificationHub />
          <InsightsPanel />
        </Suspense>
        {(ui.showCrisis || spoons === 0) && <RestOverlay onDismiss={handleCrisisDismiss} />}
        {ui.toast && <Toast message={ui.toast.message} type={ui.toast.type} onClose={() => setUi({ toast: null })} />}
        <FloatingWindow
          isOpen={sandboxOpen}
          onClose={() => setSandboxOpen(false)}
          title="Sandbox Viewport"
          initialWidth={960}
          initialHeight={640}
          triggerRef={floatingTriggerRef}
        >
          <Suspense fallback={<div className="loading-spinner">Loading...</div>}>
            <ArtifactPane />
          </Suspense>
        </FloatingWindow>
        <div id="a2ui-container" aria-live="polite" aria-label="Agent-generated content" />
        {updateReady && (
          <button className="sw-update-toast" onClick={handleSwUpdate} aria-label="Reload to apply update">
            🔄 New version available — tap to reload
          </button>
        )}
      </div>
      <div id="pocket-card-root" />
      <PocketCard />
    </>
  );
}
