import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@p31/ui', () => ({
  NotificationScreen: () => null,
  RestOverlay: () => null,
}));
vi.mock('@p31/sovereign-core', () => ({
  HeartbeatMesh: vi.fn().mockImplementation(() => ({
    connect: vi.fn(async () => 'peer-1'),
    disconnect: vi.fn(),
    broadcast: vi.fn(),
  })),
}));
vi.mock('@p31/design-core', () => ({}));
vi.mock('@p31/game-engine', () => ({ JitterbugScene: () => null }));

vi.mock('../components/Topbar', () => ({ default: () => null }));
vi.mock('../components/BottomNav', () => ({ default: () => null }));
vi.mock('../components/HomePage', () => ({ default: () => null }));
vi.mock('../components/CodePage', () => ({ default: () => null }));
vi.mock('../components/TalkPage', () => ({ default: () => null }));
vi.mock('../components/BondingPage', () => ({ default: () => null }));
vi.mock('../components/ProfilePage', () => ({ default: () => null }));
vi.mock('../components/TourOverlay', () => ({ default: () => null }));
vi.mock('../components/WalletModal', () => ({ default: () => null }));
vi.mock('../components/BreakOverlay', () => ({ default: () => null }));
vi.mock('../components/Toast', () => ({ default: () => null }));

vi.mock('../hooks/useRegisterWebMCP', () => ({ useRegisterWebMCP: vi.fn() }));
vi.mock('../hooks/useJitterbugStarfield', () => ({
  useJitterbugStarfield: vi.fn(() => ({ containerRef: { current: null } })),
}));

vi.mock('../store/useAppStore', () => {
  const state = {
    spoons: 3, tab: 'home', darkMode: false, reduceMotion: false,
    soundEffects: true, timerSeconds: 1800, mood: null,
    profile: { name: 'Test', starCount: 0, gamesCompleted: 0, moodCount: 0, sbtMilestones: [], did: '', sbts: [], tetrahedron: { vertices: [] }, role: 'teen' },
    did: '', loveBalance: null,
    mesh: { localDid: '', nodes: new Map(), topology: 'isolated', symmetry: 1, curvature: 0, heartbeatInterval: 30000 },
    meshInstance: null, caregiverPin: '1234',
    ui: { showCrisis: false, showBreak: false, showPin: false, toast: null, pinTitle: '', pinDesc: '', pinResolve: null, pinReject: null, caregiverPanelVisible: false },
    setSpoons: vi.fn(), setTab: vi.fn(), setDarkMode: vi.fn(), setReduceMotion: vi.fn(),
    setSoundEffects: vi.fn(), setTimerSeconds: vi.fn(), setMood: vi.fn(), setUi: vi.fn(),
    addStar: vi.fn(), completeGame: vi.fn(), updateProfile: vi.fn(), updateTetrahedronVertex: vi.fn(),
    addSBT: vi.fn(), mintAchievementSBT: vi.fn(), showToast: vi.fn(), extendSession: vi.fn(),
    openPin: vi.fn(), closePin: vi.fn(), refreshLoveBalance: vi.fn(), mintLove: vi.fn(),
    ensureDid: vi.fn(), setCaregiverPin: vi.fn(), setMeshInstance: vi.fn(), updateMesh: vi.fn(),
    incrementMoodCount: vi.fn(), checkMoodMilestone: vi.fn(), checkLoveMilestone: vi.fn(),
  };
  const hook = (selector?: (s: typeof state) => unknown) => selector ? selector(state) : state;
  hook.getState = () => state;
  return { useAppStore: hook };
});

import App from '../App';

describe('Teen Portal (BASH)', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('has bash brand attribute', () => {
    const { container } = render(<App />);
    const el = container.querySelector('[data-brand]');
    expect(el?.getAttribute('data-brand')).toBe('bash');
  });
});
