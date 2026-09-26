import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DomeBackground from './components/DomeBackground';
import { Topbar } from './components/Topbar';
import { SidebarNav } from './components/SidebarNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';
import { CalmOverlay } from './components/CalmOverlay';
import { NotificationStack } from './components/NotificationStack';
import { useNotifStore } from './lib/useNotifStore';
import { mcpToolForPath } from './lib/mcpTools';
import { useSpoonsStore } from './lib/useSpoonsStore';
import LedController from '@p31/p31ca-ambient/LedController';

const Showcase = lazy(() => import('./routes/Showcase/Showcase'));
const Marketplace = lazy(() => import('./routes/Marketplace/Marketplace'));
const Catalog = lazy(() => import('./routes/Catalog/Catalog'));
const Playground = lazy(() => import('./routes/Playground/Playground'));
const Tokens = lazy(() => import('./routes/Tokens/Tokens'));
const GlassLab = lazy(() => import('./routes/GlassLab/GlassLab'));
const Brands = lazy(() => import('./routes/Brands/Brands'));
const Recipes = lazy(() => import('./routes/Recipes/Recipes'));
const McpConsole = lazy(() => import('./routes/McpConsole/McpConsole'));
const Accessibility = lazy(() => import('./routes/Accessibility/Accessibility'));
const Icons = lazy(() => import('./routes/Icons/Icons'));
const A2ui = lazy(() => import('./routes/A2ui/A2ui'));
const Dome = lazy(() => import('./routes/Dome/Dome'));

const MODES = ['spark', 'maker', 'workshop'] as const;
type Mode = (typeof MODES)[number];

/** SurfaceSkeleton — component-shaped loading (not a spinner). */
function SurfaceSkeleton() {
  return (
    <div className="surface-skeleton" aria-busy="true" aria-label="Loading surface">
      <div className="skeleton-tile" />
      <div className="skeleton-row" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  );
}

function AppShell() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [modeIdx, setModeIdx] = useState(0);

  useEffect(() => {
    const scale = spoons >= 4 ? '1' : spoons === 3 ? '0.6' : spoons >= 1 ? '0.2' : '0';
    document.documentElement.style.setProperty('--motion-scale', scale);
    document.documentElement.setAttribute('data-spoons', String(spoons));
    document.body.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mode = MODES[modeIdx];
  const notify = useNotifStore((s) => s.notify);

  useEffect(() => {
    notify({ kind: 'milestone', title: 'Quantum Material', body: 'The design system of the future, live. Try the theme picker →' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <DomeBackground orbitable={pathname === '/dome'} />
      <Topbar
        mode={mode}
        onElevate={() => setModeIdx((i) => (i + 1) % MODES.length)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* p31ca.org LED dome controller — global, bottom-right chip. */}
      <LedController />

      <div className="app-shell">
        <SidebarNav />
        <main className="main-workspace" id="main-content" data-mcp-tool={mcpToolForPath(pathname)}>
          <Suspense fallback={<SurfaceSkeleton />}>
            <Routes>
              <Route path="/" element={<Showcase />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/components" element={<Navigate to="/catalog" replace />} />
              <Route path="/tokens" element={<Tokens />} />
              <Route path="/glass" element={<GlassLab />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/mcp" element={<McpConsole />} />
              <Route path="/a11y" element={<Accessibility />} />
              <Route path="/icons" element={<Icons />} />
              <Route path="/a2ui" element={<A2ui />} />
              <Route path="/dome" element={<Dome />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <MobileBottomNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <CalmOverlay />
      <NotificationStack />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}