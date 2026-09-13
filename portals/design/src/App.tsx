import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AmbientStarfield from './components/AmbientStarfield';
import { CommandPalette, SectionStrip, Topbar, BottomNav, CrisisOverlay, Footer, Chameleon, StatusBadge, MetricBadge, SpoonDial } from '@p31/design-core/compositions';
import { NAV_SECTIONS, isActivePath } from './lib/nav';
import P31Icon from './components/icons/P31Icon';
import { useSpoonsStore } from './lib/useSpoonsStore';

const Home = lazy(() => import('./routes/Home/Home'));
const Tokens = lazy(() => import('./routes/Tokens/Tokens'));
const Components = lazy(() => import('./routes/Components/Components'));
const GlassLab = lazy(() => import('./routes/GlassLab/GlassLab'));
const Brands = lazy(() => import('./routes/Brands/Brands'));
const Recipes = lazy(() => import('./routes/Recipes/Recipes'));
const Playground = lazy(() => import('./routes/Playground/Playground'));
const McpConsole = lazy(() => import('./routes/McpConsole/McpConsole'));
const Accessibility = lazy(() => import('./routes/Accessibility/Accessibility'));
const Icons = lazy(() => import('./routes/Icons/Icons'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppShell() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-spoons', String(spoons));
    document.body.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paletteItems = NAV_SECTIONS.map((s) => ({
    id: s.path,
    label: s.label,
    description: s.description,
    icon: <P31Icon name={s.icon} size={16} />,
  }));

  const goHome = () => navigate('/');

  const brand = (
    <button className="topbar-brand" onClick={goHome} aria-label="P31 Design System — home">
      <span className="brand-mark" aria-hidden="true">P31</span>
      <span className="brand-word">Design System</span>
      <span className="hide-mobile brand-version">v2.0.0</span>
    </button>
  );

  const right = (
    <>
      <span className="hide-mobile">
        <StatusBadge status="online" label="Live build" />
      </span>
      <span className="hide-mobile">
        <MetricBadge value="124" label="tokens" icon={<span className="status-dot" />} />
      </span>
      <span className="hide-mobile">
        <SpoonDial level={spoons} onChange={setSpoons} />
      </span>
      <button
        className="cmdk-trigger"
        onClick={() => setPaletteOpen(true)}
        aria-label="Open command palette"
        title="Command palette (⌘K)"
      >
        <P31Icon name="search" size={15} />
      </button>
      <Chameleon />
    </>
  );

  return (
    <div className="portal-shell">
      <AmbientStarfield />
      <Topbar brand={brand} right={right} />
      <main id="main-content" className="viewport">
        <SectionStrip
          items={NAV_SECTIONS.map((s) => ({
            id: s.path,
            label: s.label,
            icon: <P31Icon name={s.icon} size={14} />,
            active: isActivePath(s.path, pathname),
          }))}
          onSelect={(id) => navigate(id)}
        />
        <div className="portal-main">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tokens" element={<Tokens />} />
              <Route path="/components" element={<Components />} />
              <Route path="/glass" element={<GlassLab />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/mcp" element={<McpConsole />} />
              <Route path="/a11y" element={<Accessibility />} />
              <Route path="/icons" element={<Icons />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Footer columns={[
            { title: 'System', links: [{ label: 'Tokens', href: '/tokens' }, { label: 'Components', href: '/components' }, { label: 'Recipes', href: '/recipes' }, { label: 'Icons', href: '/icons' }] },
            { title: 'Explore', links: [{ label: 'Glass Lab', href: '/glass' }, { label: 'Brands', href: '/brands' }, { label: 'Playground', href: '/playground' }, { label: 'Accessibility', href: '/a11y' }] }
          ]} />
        </div>
      </main>
      <BottomNav
        items={NAV_SECTIONS.map((s) => ({
          icon: <P31Icon name={s.icon} size={20} />,
          label: s.label,
          onClick: () => navigate(s.path),
        }))}
        activeIndex={Math.max(0, NAV_SECTIONS.findIndex((s) => s.path === pathname))}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        onSelect={(id) => navigate(id)}
        placeholder="Search sections…"
        leadingIcon={<P31Icon name="search" size={16} />}
      />
      <CrisisOverlay visible={spoons === 0} onReady={() => setSpoons(2)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}