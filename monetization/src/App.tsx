import { lazy, Suspense, useEffect, useState } from 'react';
import { Topbar } from './components/Topbar';
import { SidebarNav } from './components/SidebarNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';
import { CalmOverlay } from './components/CalmOverlay';
import { AmbientStarfield } from './components/AmbientStarfield';
import { NotificationStack } from './components/NotificationStack';
import { useSpoonsStore } from './lib/useSpoonsStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePrefetchFlagshipsOnIdle } from './hooks/usePrefetch';
import { FloatingSpoonDial } from './components/FloatingSpoonDial';
import { SECTIONS, sectionFromHash, type SectionId } from './lib/nav';
import { installMCPTools } from './lib/mcpTools';

const HomeSurface = lazy(() => import('./surfaces/HomeSurface'));
const RevenueSurface = lazy(() => import('./surfaces/RevenueSurface'));
const PositionsSurface = lazy(() => import('./surfaces/PositionsSurface'));
const OpportunitiesSurface = lazy(() => import('./surfaces/OpportunitiesSurface'));
const InvoicesSurface = lazy(() => import('./surfaces/InvoicesSurface'));
const DonationsSurface = lazy(() => import('./surfaces/DonationsSurface'));
const BillingSurface = lazy(() => import('./surfaces/BillingSurface'));
const UsageSurface = lazy(() => import('./surfaces/UsageSurface'));
const OpsSurface = lazy(() => import('./surfaces/OpsSurface'));
const SettingsSurface = lazy(() => import('./surfaces/SettingsSurface'));
const ProfileSurface = lazy(() => import('./surfaces/ProfileSurface'));
const TrustSurface = lazy(() => import('./surfaces/TrustSurface'));
const CommunitySurface = lazy(() => import('./surfaces/CommunitySurface'));

const SURFACES: Record<SectionId, React.LazyExoticComponent<React.ComponentType<{ onNavigate?: (id: SectionId) => void }>>> = {
  home: HomeSurface,
  revenue: RevenueSurface,
  positions: PositionsSurface,
  opportunities: OpportunitiesSurface,
  invoices: InvoicesSurface,
  donations: DonationsSurface,
  billing: BillingSurface,
  usage: UsageSurface,
  ops: OpsSurface,
  settings: SettingsSurface,
  profile: ProfileSurface,
  trust: TrustSurface,
  community: CommunitySurface,
};

export default function App() {
  const [active, setActive] = useState<SectionId>(() => sectionFromHash(location.hash));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [live, setLive] = useState(false);
  const spoons = useSpoonsStore((s) => s.spoons);

  useEffect(() => {
    const onHash = () => setActive(sectionFromHash(location.hash));
    window.addEventListener('hashchange', onHash);
    installMCPTools();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Deep-link routing: a path-based URL (https://monetization.p31ca.org/revenue)
  // is converted to hash routing on first load, so universal links land on the
  // intended surface instead of the home screen.
  useEffect(() => {
    const seg = location.pathname.replace(/^\/+/, '').split('/')[0];
    if (seg && SECTIONS.some((s) => s.id === seg)) {
      history.replaceState(null, '', '/');
      location.hash = `#/${seg}`;
    }
  }, []);

  useEffect(() => {
    const scale = spoons >= 4 ? '1' : spoons === 3 ? '0.6' : spoons >= 1 ? '0.2' : '0';
    document.documentElement.style.setProperty('--motion-scale', scale);
    document.documentElement.setAttribute('data-spoons', String(spoons));
    document.body.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch('https://p31-monetization.trimtab-signal.workers.dev/api/revenue/summary?range=7d', {
          headers: { Accept: 'application/json' },
        });
        if (!cancelled) setLive(res.ok);
      } catch {
        if (!cancelled) setLive(false);
      }
    };
    void ping();
    const timer = window.setInterval(ping, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const go = (id: SectionId) => {
    location.hash = `#/${id}`;
  };

  useKeyboardShortcuts({ paletteOpen, setPaletteOpen, onNavigate: go });
  // Warm the flagship surfaces (mobile tabs) after first idle.
  usePrefetchFlagshipsOnIdle();

  const Surface = SURFACES[active];

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AmbientStarfield />
      <NotificationStack />
      <Topbar onOpenPalette={() => setPaletteOpen(true)} onHome={() => go('home')} live={live} />

      <div className="app-body">
        <SidebarNav active={active} onNavigate={go} sections={SECTIONS} />
        <main className="main-workspace" id="main-content" data-mcp-tool={`p31:${active}`}>
          <Suspense fallback={<div className="surface-loading" aria-busy="true" />}>
            <Surface onNavigate={go} />
          </Suspense>
        </main>
      </div>

      <MobileBottomNav active={active} onNavigate={go} sections={SECTIONS} />
      <FloatingSpoonDial />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={go} />
      <CalmOverlay />
    </>
  );
}