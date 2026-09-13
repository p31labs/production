import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import type { Tab } from './types';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import CodePage from './components/CodePage';
import TalkPage from './components/TalkPage';
import BondingPage from './components/BondingPage';
import ProfilePage from './components/ProfilePage';
import { NotificationScreen } from '@p31/ui';
import TourOverlay from './components/TourOverlay';
import WalletModal from './components/WalletModal';
import { RestOverlay } from '@p31/ui';
import BreakOverlay from './components/BreakOverlay';
import Toast from './components/Toast';
import { HeartbeatMesh } from '@p31/sovereign-core';
import { useAppStore } from './store/useAppStore';
import { useRegisterWebMCP } from './hooks/useRegisterWebMCP';
import { useJitterbugStarfield } from './hooks/useJitterbugStarfield';

const BASH_ENABLED = true;

export default function App() {
  useRegisterWebMCP();
  const spoons = useAppStore((s) => s.spoons);
  const tab = useAppStore((s) => s.tab);
  const darkMode = useAppStore((s) => s.darkMode);
  const timerSeconds = useAppStore((s) => s.timerSeconds);
  const mood = useAppStore((s) => s.mood);
  const profile = useAppStore((s) => s.profile);
  const did = useAppStore((s) => s.did);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const mesh = useAppStore((s) => s.mesh);
  const meshInstance = useAppStore((s) => s.meshInstance);
  const ui = useAppStore((s) => s.ui);

  const setSpoons = useAppStore((s) => s.setSpoons);
  const setTab = useAppStore((s) => s.setTab);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const setTimerSeconds = useAppStore((s) => s.setTimerSeconds);
  const setMood = useAppStore((s) => s.setMood);
  const setUi = useAppStore((s) => s.setUi);
  const showToast = useAppStore((s) => s.showToast);
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
  const [starfieldPaused, setStarfieldPaused] = useState(
    () => localStorage.getItem('p31:bash:starfield-paused') === 'true'
  );
  const { containerRef: starfieldRef } = useJitterbugStarfield({ spoons, paused: starfieldPaused });
  const [showTour, setShowTour] = useState(() => localStorage.getItem('p31:tourComplete') !== 'true');
  const [showWallet, setShowWallet] = useState(false);

  const toggleStarfieldPaused = () => {
    setStarfieldPaused((prev) => {
      const next = !prev;
      localStorage.setItem('p31:bash:starfield-paused', String(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.dataset.spoons = String(spoons);
  }, [spoons]);

  useEffect(() => {
    if (!localStorage.getItem('p31:welcome-seen')) {
      setTimeout(() => {
        showToast('⚡ Welcome to BASH. Your creative coding and synth workspace is ready.', 'success');
      }, 800);
      localStorage.setItem('p31:welcome-seen', 'true');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.darkMode = String(darkMode);
  }, [darkMode]);

  useEffect(() => {
    Sentry.setUser({
      id: did || undefined,
      username: profile?.name || undefined,
    });
    Sentry.setTag('portal', 'teen');
    Sentry.setTag('spoons', String(spoons));
  }, [did, profile?.name, spoons]);

  useEffect(() => {
    if (!BASH_ENABLED) return;
    ensureDid();
    refreshLoveBalance();
  }, [BASH_ENABLED]);

  useEffect(() => {
    if (!BASH_ENABLED || !did) return;
    const mesh = new HeartbeatMesh(did, (meshState) => {
      updateMesh(meshState as Parameters<typeof updateMesh>[0]);
    });
    meshRef.current = mesh;
    mesh.connect('0.peerjs.com').then((peerId) => {
      console.log('[Teen] Mesh connected:', peerId);
      setMeshInstance(mesh);
      updateMesh({ localDid: peerId });
    }).catch((err) => {
      console.error('[Teen] Mesh connection failed:', err);
    });
    return () => {
      mesh.disconnect();
      setMeshInstance(null);
    };
  }, [did, BASH_ENABLED]);

  useEffect(() => {
    if (!BASH_ENABLED || !meshInstance) return;
    meshInstance.broadcast({
      type: 'state',
      payload: {
        did,
        role: profile?.role ?? 'guest',
        spoons,
        mood,
        timerSeconds,
        symmetry: mesh.symmetry,
        curvature: mesh.curvature,
        timestamp: Date.now(),
      },
    });
  }, [spoons, mood, timerSeconds, meshInstance, BASH_ENABLED, profile?.role]);

  useEffect(() => {
    const count = mesh.nodes.size;
    if (count > 0 && spoons > 1) window.__jitterbug?.notify('mesh_peer', 0.9, 0.1, `${count} peers`);
  }, [mesh.nodes, spoons]);

  useEffect(() => {
    if (!BASH_ENABLED) return;
    if (timerSeconds === 0) {
      setUi({ showBreak: true });
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimerSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [BASH_ENABLED, timerSeconds]);

  const handleSpoonChange = (level: number) => {
    setSpoons(level);
    if (level === 0) {
      setUi({ showCrisis: true, toast: null });
      return;
    }
    window.__jitterbug?.notify('spoon_change', 0.5, 0.5, `Spoons: ${level}`);
    setUi({ showBreak: false, showCrisis: false });
  };

  const handleCrisisDismiss = () => {
    setSpoons(2);
    setUi({ showCrisis: false });
    showToast('🌿 You\'re back! Take it slow.', 'success');
  };

  const handleBreakDismiss = () => {
    setUi({ showBreak: false });
    setTimerSeconds(5 * 60);
    showToast('🌿 Break taken.', 'success');
  };

  const handleBreakExtend = async () => {
    if (!BASH_ENABLED) return;
    const success = await extendSession(30);
    if (!success) {
      setUi({ showBreak: true });
    } else {
      setUi({ showBreak: false });
    }
  };

  const handleTimerAdd = () => {
    if (!BASH_ENABLED) return;
    setTimerSeconds((prev) => Math.min(prev + 600, 7200));
    showToast('⏱️ +10 minutes added!', 'success');
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
  };

  const handlePinComplete = (pin: string) => {
    const resolve = useAppStore.getState().ui.pinResolve;
    if (resolve) resolve(pin);
    closePin();
  };

  const handlePinCancel = () => {
    const reject = useAppStore.getState().ui.pinReject;
    if (reject) reject('cancelled');
    closePin();
  };

  const handleConnectWallet = () => {
    if (!BASH_ENABLED) {
      showToast('⚠️ Enable sovereign mode first', 'error');
      return;
    }
    setShowWallet(true);
  };

  const handleArcadeLoveEarned = async (amount: number, reason: string) => {
    if (!BASH_ENABLED) {
      showToast(`❤️ +${amount} LOVE earned!`, 'success');
      return;
    }
    await mintLove('ARCADE_REWARD', { amount, reason, timestamp: Date.now() });
    refreshLoveBalance();
    showToast(`❤️ +${amount} LOVE earned!`, 'success');
  };

  return (
    <>
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
      <div id="app" role="application" aria-label="P31 Portal" data-spoons={spoons} data-active-tab={tab} data-brand="bash">
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateRows: 'auto 1fr 56px', height: '100%', gap: '12px', boxSizing: 'border-box' }}>
      <Topbar
        spoons={spoons}
        onSpoonChange={handleSpoonChange}
        loveBalance={BASH_ENABLED ? loveBalance?.availableBalance ?? null : null}
        trustTier={BASH_ENABLED ? 'basic' : null}
        meshStatus={BASH_ENABLED ? 'online' : 'offline'}
        userName={BASH_ENABLED ? profile.name : undefined}
        did={BASH_ENABLED ? did : undefined}
      />

      <main id="main-content" role="main">
        <HomePage
          active={tab === 'home'}
          loveBalance={BASH_ENABLED ? loveBalance : null}
          spoons={spoons}
          qScore={0}
          sovereignEnabled={BASH_ENABLED}
        />
        <CodePage active={tab === 'code'} />
        <BondingPage
          active={tab === 'bonding'}
          sovereignEnabled={BASH_ENABLED}
          onMintLove={mintLove}
          showToast={showToast}
        />
        <TalkPage active={tab === 'talk'} userName={profile.name} spoons={spoons} />
        <ProfilePage
          active={tab === 'profile'}
          did={BASH_ENABLED ? did : ''}
          loveBalance={BASH_ENABLED ? loveBalance : null}
          sovereignEnabled={BASH_ENABLED}
          onRefreshLoveBalance={refreshLoveBalance}
          onConnectWallet={handleConnectWallet}
        />
        <NotificationScreen
          active={tab === 'notifications'}
          spoons={spoons}
          onSpoonChange={handleSpoonChange}
          storageKey="bash"
          starfieldPaused={starfieldPaused}
          onToggleStarfieldPaused={toggleStarfieldPaused}
        />
      </main>

      <BottomNav tab={tab} onTabChange={handleTabChange} />

      <div id="a2ui-container" aria-live="polite" aria-label="Agent-generated content" />
      </div>
      {showTour && <TourOverlay onClose={() => { localStorage.setItem('p31:tourComplete', 'true'); setShowTour(false); }} />}
      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
      {ui.showCrisis && <RestOverlay onDismiss={handleCrisisDismiss} />}
      {ui.showBreak && <BreakOverlay onDismiss={handleBreakDismiss} onExtend={handleBreakExtend} />}
      {ui.toast && <Toast message={ui.toast.message} type={ui.toast.type} onClose={() => setUi({ toast: null })} />}
    </div>
    </>
  );
}
