import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import DomeBackground from './components/DomeBackground';
import { Topbar } from './components/Topbar';
import { SidebarNav } from './components/SidebarNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';
import { CalmOverlay } from './components/CalmOverlay';
import { NotificationStack } from './components/NotificationStack';
import { SessionTracker } from './components/SessionTracker';
import { SessionSummary } from './components/SessionSummary';
import { useNotifStore } from './lib/useNotifStore';
import { mcpToolForPath } from './lib/mcpTools';
import { useSpoonsStore } from './lib/useSpoonsStore';
import { FOUNDATION_BRANCHES } from './data/foundations';
import './surfaces/session.css';
/* The ambient instrument is part of the 570KB vendor-p31ca-ambient chunk.
   It stays lazy and mounts only after the load event (useAmbientReady), so
   the ambient JS never blocks FCP/LCP on the surfaces. */
const LedController = lazy(() => import('@p31ca/p31ca-ambient/LedController'));

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
const FoundationsPage = lazy(() => import('./routes/Foundations/FoundationsPage'));
const ComponentPage = lazy(() => import('./routes/Component/ComponentPage'));

const MODES = ['spark', 'maker', 'workshop'] as const;
type Mode = (typeof MODES)[number];

/** Ambient deferral — the ambient bundle (570KB vendor chunk) mounts only
 *  after the load event so FCP/LCP lock onto the surface, not the canvases.
 *  Eager on /dome and /glass (the user is there for the ambient/glass).
 *  load + setTimeout(0) — requestIdleCallback is not in Safari. */
function useAmbientReady(eager: boolean): boolean {
  const [ready, setReady] = useState(eager);
  useEffect(() => {
    if (eager) {
      setReady(true);
      return;
    }
    const go = () => setTimeout(() => setReady(true), 0);
    if (document.readyState === 'complete') {
      go();
      return;
    }
    window.addEventListener('load', go, { once: true });
    return () => window.removeEventListener('load', go);
  }, [eager]);
  return ready;
}

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

/** Foundation + component page param routers — resolve the dynamic segment. */
function FoundationBranch() {
  const { branch } = useParams();
  const cfg = FOUNDATION_BRANCHES[branch ?? ''];
  if (!cfg) {
    return <div className="warning" role="alert">⚠️ Unknown foundation “{branch}”. Try color, typography, spacing, motion, radius, elevation, glass.</div>;
  }
  return <FoundationsPage {...cfg} />;
}

function ComponentRoute() {
  const { name } = useParams();
  return <ComponentPage name={name ?? ''} />;
}

function AppShell() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const sessionTriggerRef = useRef<HTMLButtonElement>(null);
  const [modeIdx, setModeIdx] = useState(0);

  const ambientEager = pathname === '/patterns/dome' || pathname === '/components/glass';
  const ambientReady = useAmbientReady(ambientEager);

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
      <DomeBackground orbitable={pathname === '/patterns/dome'} ready={ambientReady} />
      <Topbar
        mode={mode}
        onElevate={() => setModeIdx((i) => (i + 1) % MODES.length)}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenSession={() => setSessionOpen(true)}
        sessionTriggerRef={sessionTriggerRef}
      />

      {/* p31ca.org LED dome controller — global, bottom-right chip; mounts
          with the ambient (after load, eager on /dome + /glass). */}
      {ambientReady && (
        <Suspense fallback={null}>
          <LedController />
        </Suspense>
      )}

      <div className="app-shell">
        <SidebarNav />
        <main className="main-workspace" id="main-content" data-mcp-tool={mcpToolForPath(pathname)}>
          <Suspense fallback={<SurfaceSkeleton />}>
            <Routes>
              <Route path="/" element={<Showcase />} />
              {/* Foundations — the token tree, rendered */}
              <Route path="/foundations/tokens" element={<Tokens />} />
              <Route path="/foundations/icons" element={<Icons />} />
              <Route path="/foundations/accessibility" element={<Accessibility />} />
              <Route path="/foundations/brands" element={<Brands />} />
              {/* Components — the 32 compositions, live */}
              <Route path="/components" element={<Catalog />} />
              <Route path="/components/glass" element={<GlassLab />} />
              <Route path="/components/playground" element={<Playground />} />
              {/* Patterns — multi-component solutions */}
              <Route path="/patterns/recipes" element={<Recipes />} />
              <Route path="/patterns/dome" element={<Dome />} />
              {/* Resources — reference + governance */}
              <Route path="/resources/marketplace" element={<Marketplace />} />
              {/* Agents — AGENTS.md, DESIGN.md, MCP */}
              <Route path="/agents/mcp" element={<McpConsole />} />
              <Route path="/agents/a2ui" element={<A2ui />} />
              {/* Foundation + component pages — schema-driven, from the DTCG tree / catalog */}
              <Route path="/foundations/:branch" element={<FoundationBranch />} />
              <Route path="/components/:name" element={<ComponentRoute />} />
              {/* Legacy redirects — permanent, preserve deep links */}
              <Route path="/tokens" element={<Navigate to="/foundations/tokens" replace />} />
              <Route path="/icons" element={<Navigate to="/foundations/icons" replace />} />
              <Route path="/a11y" element={<Navigate to="/foundations/accessibility" replace />} />
              <Route path="/brands" element={<Navigate to="/foundations/brands" replace />} />
              <Route path="/catalog" element={<Navigate to="/components" replace />} />
              <Route path="/glass" element={<Navigate to="/components/glass" replace />} />
              <Route path="/playground" element={<Navigate to="/components/playground" replace />} />
              <Route path="/recipes" element={<Navigate to="/patterns/recipes" replace />} />
              <Route path="/dome" element={<Navigate to="/patterns/dome" replace />} />
              <Route path="/marketplace" element={<Navigate to="/resources/marketplace" replace />} />
              <Route path="/mcp" element={<Navigate to="/agents/mcp" replace />} />
              <Route path="/a2ui" element={<Navigate to="/agents/a2ui" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <MobileBottomNav />
      <SessionTracker />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <AnimatePresence>
        {sessionOpen && <SessionSummary onClose={() => setSessionOpen(false)} triggerRef={sessionTriggerRef} />}
      </AnimatePresence>
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