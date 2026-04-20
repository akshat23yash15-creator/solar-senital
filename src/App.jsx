import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import HomePage from './pages/HomePage'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SatelliteRiskPage = lazy(() => import('./pages/SatelliteRiskPage'))
const GridRiskPage = lazy(() => import('./pages/GridRiskPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const GlobeRiskPage = lazy(() => import('./pages/GlobeRiskPage'))

function Loading() {
  return (
    <div className="container" style={{ padding: '88px 0' }}>
      <div className="glass neon-border" style={{ padding: 18, borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: 16 }}>Loading module…</div>
            <div className="subtle" style={{ fontSize: 12, marginTop: 6 }}>
              Warming up charts / map engine
            </div>
          </div>
          <div
            aria-hidden
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: '2px solid rgba(255,255,255,0.18)',
              borderTopColor: 'rgba(34,211,238,0.9)',
              animation: 'spin 900ms linear infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <div className="app-bg" />

      <Suspense fallback={<Loading />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/satellites" element={<SatelliteRiskPage />} />
            <Route path="/globe-risk" element={<GlobeRiskPage />} />
            <Route path="/grid-risk" element={<GridRiskPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  )
}
