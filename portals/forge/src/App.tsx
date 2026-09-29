import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Topbar } from './components/Topbar'
import { SidebarNav } from './components/SidebarNav'
import { MobileBottomNav } from './components/MobileBottomNav'
import { CalmOverlay } from './components/CalmOverlay'
import { useUI } from './lib/store'

const Home = lazy(() => import('./routes/Home'))
const Catalog = lazy(() => import('./routes/Catalog'))
const PackView = lazy(() => import('./routes/Pack'))
const Compose = lazy(() => import('./routes/Compose'))
const Activity = lazy(() => import('./routes/Activity'))
const Channels = lazy(() => import('./routes/Channels'))

export default function App() {
  const { world, mode, spoons } = useUI()

  useEffect(() => {
    const root = document.documentElement
    root.dataset.world = world
    root.dataset.mode = mode
    root.dataset.capacity = spoons <= 1 ? 'low' : 'normal'
  }, [world, mode, spoons])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Topbar />
        <SidebarNav />
        <main className="app-main">
          <Suspense fallback={<div className="route-skeleton" aria-busy="true" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/pack/:kind/:id" element={<PackView />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <MobileBottomNav />
        <CalmOverlay />
      </div>
    </BrowserRouter>
  )
}