import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PortalShell, type BlockRegistry } from '@p31ca/design-core/shell'
import { EvidenceBlock, MetricRowBlock, GovernanceOverviewBlock } from '@p31ca/design-core/compositions'
import { Topbar } from './components/Topbar'
import { SidebarNav } from './components/SidebarNav'
import { MobileBottomNav } from './components/MobileBottomNav'
import { CalmOverlay } from './components/CalmOverlay'
import { initTheme } from './lib/theme'
import { useUI } from './lib/store'
import { forgeConfig } from '../forge.config'
import './playground.css'

/* The ambient instrument (dome + LED chip) — lazy, same pattern as the design
   portal: mounts after load so FCP/LCP lock onto the surface. */
const DomeBackground = lazy(() => import('./components/DomeBackground'))
const LedController = lazy(() => import('@p31ca/p31ca-ambient/LedController'))

const Home = lazy(() => import('./routes/Home'))
const Catalog = lazy(() => import('./routes/Catalog'))
const PackView = lazy(() => import('./routes/Pack'))
const Compose = lazy(() => import('./routes/Compose'))
const Playground = lazy(() => import('./routes/Playground'))
const Identity = lazy(() => import('./routes/Identity'))
const Activity = lazy(() => import('./routes/Activity'))
const Channels = lazy(() => import('./routes/Channels'))
const Schema = lazy(() => import('./routes/Schema'))

/** The forge's block registry — blockId → canon component, consumed by
 *  PortalShell for config-driven main-slot placements. */
const FORGE_BLOCK_REGISTRY: BlockRegistry = {
  'evidence-block': EvidenceBlock,
  'metric-row-block': MetricRowBlock,
  'governance-overview-block': GovernanceOverviewBlock,
}

export default function App() {
  const { world, mode, spoons } = useUI()

  useEffect(() => { initTheme() }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.world = world
    root.dataset.mode = mode
    root.dataset.capacity = spoons <= 1 ? 'low' : 'normal'
    // The canon theme-store drives accent per world via data-theme; the
    // forge's world IS the canon theme (setWorld writes the canon store).
    root.dataset.theme = world
  }, [world, mode, spoons])

  return (
    <BrowserRouter>
      <PortalShell
        config={forgeConfig}
        registry={FORGE_BLOCK_REGISTRY}
        header={<Topbar />}
        sidebar={<SidebarNav />}
        mobileNav={<MobileBottomNav />}
        extras={<CalmOverlay />}
        fallback={<div className="route-skeleton" aria-busy="true" />}
        ambient={
          <Suspense fallback={null}>
            <DomeBackground />
            <LedController />
          </Suspense>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/pack/:kind/:id" element={<PackView />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/identity" element={<Identity />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/schema" element={<Schema />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PortalShell>
    </BrowserRouter>
  )
}