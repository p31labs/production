import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import type { Tab } from './types';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import PlayPage from './components/PlayPage';
import TalkPage from './components/TalkPage';
import LearnPage from './components/LearnPage';
import CreatePage from './components/CreatePage';
import ProfilePage from './components/ProfilePage';
import { NotificationScreen } from '@p31/ui';
import { RestOverlay } from '@p31/ui';
import BreakOverlay from './components/BreakOverlay';
import PinOverlay from './components/PinOverlay';
import Toast from './components/Toast';
import TourOverlay from './components/TourOverlay';
import { HeartbeatMesh } from '@p31/sovereign-core';
import { hasSBTMilestone } from '@p31/sovereign-core';
import { useAppStore } from './store/useAppStore';
import { useRegisterWebMCP } from './hooks/useRegisterWebMCP';
import { useJitterbugStarfield } from './hooks/useJitterbugStarfield';

export default function App() {
  useRegisterWebMCP();
  const spoons = useAppStore((s) => s.spoons);
  const tab = useAppStore((s) => s.tab);
  const darkMode = useAppStore((s) => s.darkMode);
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const soundEffects = useAppStore((s) => s.soundEffects);
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
  const setReduceMotion = useAppStore((s) => s.setReduceMotion);
  const setSoundEffects = useAppStore((s) => s.setSoundEffects);
  const setTimerSeconds = useAppStore((s) => s.setTimerSeconds);
  const setMood = useAppStore((s) => s.setMood);
  const setUi = useAppStore((s) => s.setUi);
  const addStar = useAppStore((s) => s.addStar);
  const completeGame = useAppStore((s) => s.completeGame);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const updateTetrahedronVertex = useAppStore((s) => s.updateTetrahedronVertex);
  const addSBT = useAppStore((s) => s.addSBT);
  const mintAchievementSBT = useAppStore((s) => s.mintAchievementSBT);
  const showToast = useAppStore((s) => s.showToast);
  const extendSession = useAppStore((s) => s.extendSession);
  const openPin = useAppStore((s) => s.openPin);
  const closePin = useAppStore((s) => s.closePin);
  const refreshLoveBalance = useAppStore((s) => s.refreshLoveBalance);
  const mintLove = useAppStore((s) => s.mintLove);
  const caregiverPin = useAppStore((s) => s.caregiverPin);
  const setCaregiverPin = useAppStore((s) => s.setCaregiverPin);
  const ensureDid = useAppStore((s) => s.ensureDid);
  const setMeshInstance = useAppStore((s) => s.setMeshInstance);
  const updateMesh = useAppStore((s) => s.updateMesh);
  const incrementMoodCount = useAppStore((s) => s.incrementMoodCount);
  const checkMoodMilestone = useAppStore((s) => s.checkMoodMilestone);
  const checkLoveMilestone = useAppStore((s) => s.checkLoveMilestone);

  const timerRef = useRef<number | null>(null);
  const meshRef = useRef<HeartbeatMesh | null>(null);

  const [starfieldPaused, setStarfieldPaused] = useState(
    () => localStorage.getItem('p31:willow:starfield-paused') === 'true'
  );
  const { containerRef: starfieldRef } = useJitterbugStarfield({ spoons, connectionAudio: false, poetsMode: true, paused: starfieldPaused });
  const [showTour, setShowTour] = useState(
    () => localStorage.getItem('p31:tourComplete') !== 'true'
  );

  const toggleStarfieldPaused = () => {
    setStarfieldPaused((prev) => {
      const next = !prev;
      localStorage.setItem('p31:willow:starfield-paused', String(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.dataset.spoons = String(spoons);
  }, [spoons]);

  useEffect(() => {
    if (!localStorage.getItem('p31:welcome-seen')) {
      setTimeout(() => {
        showToast('🌿 Welcome to Willow! I\'m your creative companion. Try the Block Creator!', 'success');
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
    Sentry.setTag('portal', 'children');
    Sentry.setTag('spoons', String(spoons));
  }, [did, profile?.name, spoons]);

  useEffect(() => {
    if (!did) return;
    const mesh = new HeartbeatMesh(did, (meshState) => {
      updateMesh(meshState);
    });
    meshRef.current = mesh;
    mesh.connect('0.peerjs.com').then((peerId) => {
      console.log('[App] Mesh connected, peer ID:', peerId);
      setMeshInstance(mesh);
      updateMesh({ localDid: peerId });
    }).catch((err) => {
      console.error('[App] Mesh connection failed:', err);
    });
    return () => {
      mesh.disconnect();
      setMeshInstance(null);
    };
  }, [did]);

  useEffect(() => {
    if (!meshInstance) return;
    meshInstance.broadcast({
      type: 'state',
      payload: {
        did,
        role: profile?.role ?? 'child',
        name: profile.name || 'Willow',
        spoons,
        mood,
        timerSeconds,
        symmetry: mesh.symmetry,
        curvature: mesh.curvature,
        timestamp: Date.now(),
      },
    });
  }, [spoons, mood, timerSeconds, meshInstance, profile?.role]);

  useEffect(() => {
    const count = mesh.nodes.size;
    if (count > 0 && spoons > 1) window.__jitterbug?.notify('mesh_peer', 0.9, 0.1, `${count} peers`);
  }, [mesh.nodes, spoons]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setUi({ caregiverPanelVisible: false });
  }, [tab]);

  useEffect(() => {
    ensureDid();
    refreshLoveBalance();
  }, []);

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
    window.__jitterbug?.notify('recovery', 0.5, 0.5, 'Recovered');
    setUi({ showCrisis: false });
    showToast('🌿 You\'re back! Take it slow.', 'success');
  };

  const handleBreakDismiss = () => {
    setUi({ showBreak: false });
    setTimerSeconds(5 * 60);
    showToast('🌿 Break taken. Take your time.', 'success');
  };

  const handleBreakExtend = async () => {
    const success = await extendSession(30);
    if (!success) {
      setUi({ showBreak: true });
    } else {
      setUi({ showBreak: false });
    }
  };

  const handleTimerAdd = () => {
    setTimerSeconds((prev) => Math.min(prev + 600, 7200));
    showToast('⏱️ +10 minutes added!', 'success');
  };

  const handleMoodSelect = async (mood: string) => {
    setMood(mood);
    await mintLove('COHERENCE_GIFT', { mood, timestamp: Date.now() });
    window.__jitterbug?.notify('love_mint', 0.3, 0.3, 'Mood gift');
    incrementMoodCount();
    checkMoodMilestone();
    refreshLoveBalance();
    checkLoveMilestone();
  };

  const handleGamePlay = async () => {
    completeGame();
    await mintLove('MOLECULE_COMPLETE', { timestamp: Date.now() });
    window.__jitterbug?.notify('love_mint', 0.5, 0.3, 'Molecule complete');

    const gamesCompleted = profile.gamesCompleted;
    if (gamesCompleted > 0 && gamesCompleted % 5 === 0) {
      await mintAchievementSBT('Game Complete', 'Completed 5 learning games');
    }

    const starCount = profile.starCount;
    if (starCount > 0 && starCount % 3 === 0 && !hasSBTMilestone('Quest Complete')) {
      await mintAchievementSBT('Quest Complete', 'Completed daily quest');
    }

    refreshLoveBalance();
    checkLoveMilestone();
    showToast('⭐ +1 star! +10 LOVE!', 'success');
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
  };

  const handleArcadeLoveEarned = async (amount: number, reason: string) => {
    await mintLove('ARCADE_REWARD', { amount, reason, timestamp: Date.now() });
    window.__jitterbug?.notify('love_mint', 0.7, 0.3, `+${amount} LOVE`);
    refreshLoveBalance();
    checkLoveMilestone();
    showToast(`❤️ +${amount} LOVE earned!`, 'success');
  };

  const handleToggleSetting = (setting: 'darkMode' | 'reduceMotion' | 'soundEffects') => {
    if (setting === 'darkMode') {
      setDarkMode(!darkMode);
    } else if (setting === 'reduceMotion') {
      setReduceMotion(!reduceMotion);
    } else {
      setSoundEffects(!soundEffects);
    }
  };

  const handleCaregiverOpen = async () => {
    try {
      const pin = await openPin('Enter Caregiver PIN', 'Enter PIN to access caregiver settings.');
      const currentPin = caregiverPin;
      if (pin === currentPin) {
        setUi({ caregiverPanelVisible: true });
        showToast('🔓 Caregiver panel unlocked', 'success');
      } else {
        showToast('❌ Incorrect PIN.', 'error');
      }
    } catch {
      // cancelled
    }
  };

  const handleCaregiverExtend = async () => {
    await extendSession(30);
  };

  const handleChangePin = async () => {
    try {
      const oldPin = await openPin('Enter Current PIN', 'Enter your current caregiver PIN.');
      const currentPin = caregiverPin;
      if (oldPin === currentPin) {
        const newPin = await openPin('New PIN', 'Enter a new 4-digit PIN.');
        if (newPin && newPin.length === 4) {
          updateTetrahedronVertex(3, {
            familyDid: null,
            guardianDid: null,
            meshPeers: [],
            caregiverPin: newPin,
          });
          setCaregiverPin(newPin);
          showToast('🔑 PIN changed successfully!', 'success');
        } else {
          showToast('❌ PIN must be 4 digits.', 'error');
        }
      } else {
        showToast('❌ Incorrect PIN.', 'error');
      }
    } catch {
      // cancelled
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all local data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
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

  return (
    <div className="app" data-brand="willow" data-spoons={spoons} data-active-tab={tab}>
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
        starCount={(profile as any).starCount || 0}
        timerSeconds={timerSeconds}
        avatar={profile.avatar}
        userName={profile.name}
        onSpoonChange={handleSpoonChange}
        onTimerAdd={handleTimerAdd}
      />

      <main className="viewport" id="pages" role="main">
        <HomePage
          active={tab === 'home'}
          mood={mood}
          questProgress={(profile as any).starCount % 3}
          userName={profile.name}
          onMoodSelect={handleMoodSelect}
          onNavigate={handleTabChange}
        />
        <PlayPage
          active={tab === 'play'}
          gamesCompleted={(profile as any).gamesCompleted || 0}
          starCount={(profile as any).starCount || 0}
          spoons={spoons}
          role={profile.role}
          onPlayGame={handleGamePlay}
          onLoveEarned={handleArcadeLoveEarned}
        />
        <TalkPage active={tab === 'talk'} userName={profile.name} spoons={spoons} />
        <LearnPage active={tab === 'learn'} onStartTopic={() => showToast('📚 Topic coming soon!')} />
        <CreatePage active={tab === 'create'} />
        <ProfilePage
          active={tab === 'profile'}
          starCount={(profile as any).starCount || 0}
          gamesCompleted={(profile as any).gamesCompleted || 0}
          did={did}
          avatar={profile.avatar}
          userName={profile.name}
          darkMode={darkMode}
          reduceMotion={reduceMotion}
          soundEffects={soundEffects}
          caregiverPanelVisible={ui.caregiverPanelVisible}
          onToggleSetting={handleToggleSetting}
          onCaregiverOpen={handleCaregiverOpen}
          onCaregiverExtend={handleCaregiverExtend}
          onChangePin={handleChangePin}
          onResetData={handleResetData}
          onCloseCaregiverPanel={() => setUi({ caregiverPanelVisible: false })}
          onUpdateProfile={updateProfile}
          loveBalance={loveBalance}
          sbts={profile.sbts}
          onRefreshLoveBalance={refreshLoveBalance}
        />
        <NotificationScreen
          active={tab === 'notifications'}
          spoons={spoons}
          onSpoonChange={handleSpoonChange}
          storageKey="willow"
          starfieldPaused={starfieldPaused}
          onToggleStarfieldPaused={toggleStarfieldPaused}
        />
      </main>

      <BottomNav tab={tab} onTabChange={handleTabChange} />

      {ui.showCrisis && <RestOverlay onDismiss={handleCrisisDismiss} />}
      {ui.showBreak && (
        <BreakOverlay
          onDismiss={handleBreakDismiss}
          onExtend={handleBreakExtend}
        />
      )}
      {ui.showPin && (
        <PinOverlay
          title={ui.pinTitle}
          desc={ui.pinDesc}
          onComplete={handlePinComplete}
          onCancel={handlePinCancel}
        />
      )}
      {ui.toast && <Toast message={ui.toast.message} type={ui.toast.type} onClose={() => setUi({ toast: null })} />}
      {showTour && <TourOverlay onClose={() => setShowTour(false)} />}
    </div>
  );
}
