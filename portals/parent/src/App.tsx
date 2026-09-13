import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import type { Tab } from './types';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import DashboardPage from './components/DashboardPage';
import GuardrailsPage from './components/GuardrailsPage';
import SandboxPage from './components/SandboxPage';
import TalkPage from './components/TalkPage';
import ProfilePage from './components/ProfilePage';
import { NotificationScreen } from '@p31/ui';
import { RestOverlay } from '@p31/ui';
import BreakOverlay from './components/BreakOverlay';
import PinOverlay from './components/PinOverlay';
import Toast from './components/Toast';
import TourOverlay from './components/TourOverlay';
import { HeartbeatMesh } from '@p31/sovereign-core';
import { useAppStore } from './store/useAppStore';
import { useRegisterWebMCP } from './hooks/useRegisterWebMCP';
import { useJitterbugStarfield } from './hooks/useJitterbugStarfield';

const PHOS_ENABLED = true;

const CHILD_SPOON_KEY = 'parent-child-spoons';
const TEEN_SPOON_KEY = 'parent-teen-spoons';

export default function App() {
  useRegisterWebMCP();
  const spoons = useAppStore((s) => s.spoons);
  const tab = useAppStore((s) => s.tab);
  const darkMode = useAppStore((s) => s.darkMode);
  const timerSeconds = useAppStore((s) => s.timerSeconds);
  const profile = useAppStore((s) => s.profile);
  const did = useAppStore((s) => s.did);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const mesh = useAppStore((s) => s.mesh);
  const meshInstance = useAppStore((s) => s.meshInstance);
  const ui = useAppStore((s) => s.ui);

  const setSpoons = useAppStore((s) => s.setSpoons);
  const setTab = useAppStore((s) => s.setTab);
  const setUi = useAppStore((s) => s.setUi);
  const showToast = useAppStore((s) => s.showToast);
  const setTimerSeconds = useAppStore((s) => s.setTimerSeconds);
  const extendSession = useAppStore((s) => s.extendSession);
  const openPin = useAppStore((s) => s.openPin);
  const closePin = useAppStore((s) => s.closePin);
  const refreshLoveBalance = useAppStore((s) => s.refreshLoveBalance);
  const mintLove = useAppStore((s) => s.mintLove);
  const ensureDid = useAppStore((s) => s.ensureDid);
  const setMeshInstance = useAppStore((s) => s.setMeshInstance);
  const updateMesh = useAppStore((s) => s.updateMesh);

  const timerRef = useRef<number | null>(null);
  const meshRef = useRef<HeartbeatMesh | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [childSpoons, setChildSpoons] = useState(() => Number(localStorage.getItem(CHILD_SPOON_KEY) || 4));
  const [teenSpoons, setTeenSpoons] = useState(() => Number(localStorage.getItem(TEEN_SPOON_KEY) || 3));
  const [showTour, setShowTour] = useState(
    () => localStorage.getItem('p31:tourComplete') !== 'true'
  );
  const [starfieldPaused, setStarfieldPaused] = useState(
    () => localStorage.getItem('p31:phos:starfield-paused') === 'true'
  );

  const { containerRef: starfieldRef } = useJitterbugStarfield({ spoons, connectionAudio: PHOS_ENABLED, paused: starfieldPaused });

  const toggleStarfieldPaused = () => {
    setStarfieldPaused((prev) => {
      const next = !prev;
      localStorage.setItem('p31:phos:starfield-paused', String(next));
      return next;
    });
  };

  useEffect(() => { document.documentElement.dataset.spoons = String(spoons); }, [spoons]);

  useEffect(() => {
    if (!localStorage.getItem('p31:welcome-seen')) {
      setTimeout(() => {
        showToast('🛡️ Welcome to PHOS. Dashboard ready — monitor family energy and policies.', 'success');
      }, 800);
      localStorage.setItem('p31:welcome-seen', 'true');
    }
  }, []);

  useEffect(() => {
    Sentry.setUser({ id: did || undefined, username: profile?.name || undefined });
    Sentry.setTag('portal', 'parent');
    Sentry.setTag('spoons', String(spoons));
  }, [did, profile?.name, spoons]);

  useEffect(() => {
    if (!PHOS_ENABLED) return;
    ensureDid();
    refreshLoveBalance();
  }, []);

  useEffect(() => {
    if (!PHOS_ENABLED || !did) return;
    const mesh = new HeartbeatMesh(did, (meshState) => { updateMesh(meshState as Parameters<typeof updateMesh>[0]); });
    meshRef.current = mesh;
    mesh.connect('0.peerjs.com').then((peerId) => {
      setMeshInstance(mesh);
      updateMesh({ localDid: peerId });
    }).catch(() => {});
    return () => { mesh.disconnect(); setMeshInstance(null); };
  }, [did]);

  useEffect(() => {
    if (!PHOS_ENABLED || !meshInstance) return;
    meshInstance.broadcast({
      type: 'state',
      payload: { did, role: profile?.role ?? 'guest', spoons, timerSeconds, symmetry: mesh.symmetry, curvature: mesh.curvature, timestamp: Date.now() },
    });
  }, [spoons, timerSeconds, meshInstance, profile?.role]);

  useEffect(() => {
    const count = mesh.nodes.size;
    if (count > 0 && spoons > 1) window.__jitterbug?.notify('mesh_peer', 0.9, 0.1, `${count} peers`);
  }, [mesh.nodes, spoons]);

  useEffect(() => {
    if (!PHOS_ENABLED) return;
    if (timerSeconds === 0) { setUi({ showBreak: true }); return; }
    timerRef.current = window.setInterval(() => {
      setTimerSeconds(Math.max(timerSeconds - 1, 0));
    }, 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [timerSeconds]);

  const handleSetChildSpoons = (n: number) => {
    const v = Math.max(0, Math.min(5, n));
    setChildSpoons(v);
    localStorage.setItem(CHILD_SPOON_KEY, String(v));
    window.__jitterbug?.notify('spoon_change', 0.2, 0.3, `Child spoons: ${v}`);
  };
  const handleSetTeenSpoons = (n: number) => {
    const v = Math.max(0, Math.min(5, n));
    setTeenSpoons(v);
    localStorage.setItem(TEEN_SPOON_KEY, String(v));
    window.__jitterbug?.notify('spoon_change', 0.8, 0.3, `Teen spoons: ${v}`);
  };

  const handleSpoonChange = (level: number) => {
    setSpoons(level);
    if (level === 0) {
      setUi({ showCrisis: true, toast: null });
      return;
    }
    window.__jitterbug?.notify('spoon_change', 0.5, 0.9, `Parent spoons: ${level}`);
    setUi({ showBreak: false, showCrisis: false });
  };

  const handleCrisisDismiss = () => { setSpoons(2); window.__jitterbug?.notify('recovery', 0.5, 0.5, 'Recovered'); setUi({ showCrisis: false }); showToast('🌿 You\'re back! Take it slow.', 'success'); };
  const handleBreakDismiss = () => { setUi({ showBreak: false }); showToast('🌿 Break taken.', 'success'); };
  const handleBreakExtend = async () => { if (!PHOS_ENABLED) return; const ok = await extendSession(30); setUi({ showBreak: !ok }); };
  const handleConnectWallet = () => { if (!PHOS_ENABLED) { showToast('⚠️ Enable sovereign mode first', 'error'); return; } setWalletConnected(true); showToast('✅ Wallet connected', 'success'); };

  const handleTabChange = (newTab: Tab) => { setTab(newTab); };

  const handlePinComplete = (pin: string) => {
    const resolve = useAppStore.getState().ui.pinResolve;
    if (resolve) resolve(pin);
    closePin();
  };
  const handlePinCancel = () => { const reject = useAppStore.getState().ui.pinReject; if (reject) reject('cancelled'); closePin(); };

  return (
    <div className="app-shell" data-spoons={spoons} data-brand="phos">
      <div
        ref={starfieldRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          filter: spoons <= 1 ? 'saturate(0.85) brightness(0.95)' : 'none',
          transition: 'filter 0.6s ease',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <Topbar
        tab={tab}
        spoons={spoons}
        onTabChange={handleTabChange}
        onSpoonChange={handleSpoonChange}
        loveBalance={loveBalance?.availableBalance ?? null}
        walletConnected={walletConnected}
        onConnectWallet={handleConnectWallet}
      />

      <DashboardPage active={tab === 'dashboard'} />


      <GuardrailsPage
        active={tab === 'guardrails'}
        spoons={spoons}
        childSpoons={childSpoons}
        teenSpoons={teenSpoons}
        onSetChildSpoons={handleSetChildSpoons}
        onSetTeenSpoons={handleSetTeenSpoons}
      />

      <TalkPage active={tab === 'talk'} userName={profile.name} spoons={spoons} />
        <ProfilePage active={tab === 'profile'} />
        <SandboxPage active={tab === 'sandbox'} />

        <NotificationScreen
          active={tab === 'notifications'}
          spoons={spoons}
          onSpoonChange={handleSpoonChange}
          storageKey="phos"
          starfieldPaused={starfieldPaused}
          onToggleStarfieldPaused={toggleStarfieldPaused}
        />

      <BottomNav tab={tab} onTabChange={handleTabChange} />
      </div>
      {ui.showCrisis && <RestOverlay onDismiss={handleCrisisDismiss} />}
      {ui.showBreak && <BreakOverlay onDismiss={handleBreakDismiss} onExtend={handleBreakExtend} />}
      {ui.showPin && (
        <PinOverlay
          title={ui.pinTitle || 'Enter PIN'}
          desc={ui.pinDesc || ''}
          onComplete={handlePinComplete}
          onCancel={handlePinCancel}
        />
      )}
      {ui.toast && <Toast message={ui.toast.message} type={ui.toast.type} onClose={() => setUi({ toast: null })} />}
      {showTour && <TourOverlay onClose={() => setShowTour(false)} />}
    </div>
  );
}
