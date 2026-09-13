import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import type { Tab } from './types';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import MapPage from './components/MapPage';
import TalkPage from './components/TalkPage';
import ProfilePage from './components/ProfilePage';
import { NotificationScreen } from '@p31/ui';
import { RestOverlay } from '@p31/ui';
import BreakOverlay from './components/BreakOverlay';
import PinOverlay from './components/PinOverlay';
import Toast from './components/Toast';
import TourOverlay from './components/TourOverlay';
import PingModal from './components/PingModal';
import EditProfileModal from './components/EditProfileModal';
import { HeartbeatMesh } from '@p31/sovereign-core';
import { useAppStore } from './store/useAppStore';
import { useJitterbugStarfield } from './hooks/useJitterbugStarfield';
import { atomsFromMesh, bondsFromAtoms, activitiesFromTransactions, type Atom, type Bond, type Activity } from './lib/game';
import { getLoveTransactions } from '@p31/sovereign-core';
import { registerMeatspaceWebMCPTools } from './lib/registerTools';

const BONDING_ENABLED = true;

export default function App() {
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

  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [modal, setModal] = useState<'ping' | 'edit' | null>(null);
  const [showTour, setShowTour] = useState(
    () => localStorage.getItem('p31:tourComplete') !== 'true'
  );
  const [pingTarget, setPingTarget] = useState<Atom | null>(null);
  const [starfieldPaused, setStarfieldPaused] = useState(
    () => localStorage.getItem('p31:bonding:starfield-paused') === 'true'
  );

  const { containerRef: starfieldRef } = useJitterbugStarfield({ spoons, paused: starfieldPaused });

  const toggleStarfieldPaused = () => {
    setStarfieldPaused((prev) => {
      const next = !prev;
      localStorage.setItem('p31:bonding:starfield-paused', String(next));
      return next;
    });
  };

  const timerRef = useRef<number | null>(null);
  const meshRef = useRef<HeartbeatMesh | null>(null);

  useEffect(() => {
    document.documentElement.dataset.spoons = String(spoons);
  }, [spoons]);

  useEffect(() => {
    if (!localStorage.getItem('p31:welcome-seen')) {
      setTimeout(() => {
        showToast('🔗 Welcome to BONDING. You\'re an atom in a social molecule.', 'success');
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
    Sentry.setTag('portal', 'meatspace');
    Sentry.setTag('spoons', String(spoons));
  }, [did, profile?.name, spoons]);

  useEffect(() => {
    if (!BONDING_ENABLED) return;
    ensureDid();
    refreshLoveBalance();
  }, []);

  useEffect(() => {
    if (!BONDING_ENABLED || !did) return;
    const mesh = new HeartbeatMesh(did, (meshState) => {
      updateMesh(meshState as Parameters<typeof updateMesh>[0]);
    });
    meshRef.current = mesh;
    mesh.connect('0.peerjs.com').then((peerId) => {
      console.log('[Meatspace] Mesh connected:', peerId);
      setMeshInstance(mesh);
      updateMesh({ localDid: peerId });
    }).catch((err) => {
      console.error('[Meatspace] Mesh connection failed:', err);
    });
    return () => {
      mesh.disconnect();
      setMeshInstance(null);
    };
  }, [did, BONDING_ENABLED]);

  useEffect(() => {
    if (!BONDING_ENABLED || !meshInstance) return;
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
  }, [spoons, mood, timerSeconds, meshInstance, BONDING_ENABLED, profile?.role]);

  useEffect(() => {
    if (!BONDING_ENABLED) return;
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
  }, [BONDING_ENABLED, timerSeconds]);

  useEffect(() => {
    const derivedAtoms = atomsFromMesh(mesh.nodes);
    setAtoms(derivedAtoms);
    setBonds(bondsFromAtoms(derivedAtoms));
    const count = mesh.nodes.size;
    if (count > 0 && spoons > 1) window.__jitterbug?.notify('mesh_peer', 0.9, 0.1, `${count} peers`);
  }, [mesh.nodes, spoons]);

  useEffect(() => {
    if (!did || !BONDING_ENABLED) {
      setActivities([]);
      return;
    }
    let cancelled = false;
    getLoveTransactions(did).then((txs) => {
      if (!cancelled) {
        setActivities(activitiesFromTransactions(txs));
      }
    });
    return () => { cancelled = true; };
  }, [did, BONDING_ENABLED]);

  const handleSpoonChange = (level: number) => {
    setSpoons(level);
    if (level === 0) {
      setUi({ showCrisis: true, toast: null });
      return;
    }
    window.__jitterbug?.notify('spoon_change', 0.5, 0.5, `Spoons: ${level}`);
    setUi({ showBreak: false, showCrisis: false });
  };

  const handleRestDismiss = () => {
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
    if (!BONDING_ENABLED) return;
    const success = await extendSession(30);
    if (!success) {
      setUi({ showBreak: true });
    } else {
      setUi({ showBreak: false });
    }
  };

  const handleTimerAdd = () => {
    if (!BONDING_ENABLED) return;
    setTimerSeconds((prev) => Math.min(prev + 600, 7200));
    showToast('⏱️ +10 minutes added!', 'success');
  };

  const handleCheckIn = (zone: string) => {
    showToast('📍 Checked in to ' + zone);
  };

  const handlePing = (atom: Atom) => {
    setPingTarget(atom);
    setModal('ping');
  };

  const handleEdit = () => {
    setModal('edit');
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

  useEffect(() => {
    registerMeatspaceWebMCPTools();
  }, []);

  return (
    <div className="app" data-brand="meatspace" data-spoons={spoons} data-active-tab={tab}>
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
      <Topbar
        spoons={spoons}
        onSpoonChange={handleSpoonChange}
      />

      <main className="viewport" id="pages" role="main">
        <MapPage active={tab === 'map'} atoms={atoms} onCheckIn={handleCheckIn} onPing={handlePing} />
        <TalkPage active={tab === 'talk'} />
        <ProfilePage
          active={tab === 'profile'}
          atoms={atoms}
          bonds={bonds}
          activities={activities}
          onEdit={handleEdit}
        />
        <NotificationScreen
          active={tab === 'notifications'}
          spoons={spoons}
          onSpoonChange={handleSpoonChange}
          storageKey="bonding"
          starfieldPaused={starfieldPaused}
          onToggleStarfieldPaused={toggleStarfieldPaused}
        />
      </main>

      <BottomNav tab={tab} onTabChange={handleTabChange} />

      {ui.showCrisis && <RestOverlay onDismiss={handleRestDismiss} />}
      {ui.showBreak && <BreakOverlay onDismiss={handleBreakDismiss} onExtend={handleBreakExtend} />}
      {ui.showPin && <PinOverlay title="Enter PIN" desc="" onComplete={handlePinComplete} onCancel={handlePinCancel} />}
      {ui.toast && <Toast message={ui.toast.message} type={ui.toast.type} onClose={() => setUi({ toast: null })} />}
      {showTour && <TourOverlay onClose={() => setShowTour(false)} />}
      {modal === 'ping' && <PingModal atom={pingTarget} onClose={() => setModal(null)} />}
      {modal === 'edit' && <EditProfileModal onClose={() => setModal(null)} />}
    </div>
  );
}
