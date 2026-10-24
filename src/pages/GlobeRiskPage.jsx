import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Info, Satellite, Layers, RefreshCw } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import SatelliteDetails from '../components/SatelliteDetails'
import GlobeRiskScene from '../components/GlobeRiskScene'
import { fetchFullHelioRisk } from '../utils/helioApi'

export default function GlobeRiskPage() {
  const [selectedSatellite, setSelectedSatellite] = useState(null)
  const [satData, setSatData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Requirement 5 Filters: All / High / Medium / Low + View Mode
  const [riskFilter, setRiskFilter] = useState('ALL') // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [viewMode, setViewMode] = useState('all') // 'all' | 'curated'

  const loadData = async (signal) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchFullHelioRisk(signal)
      setSatData(data)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load satellites from API.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const ctrl = new AbortController()
    loadData(ctrl.signal)
    return () => ctrl.abort()
  }, [])

  // Filter only real satellites with valid coordinates from the API
  const displayedSatellites = useMemo(() => {
    if (!satData) return []
    const source =
      viewMode === 'all'
        ? satData.all_satellites && satData.all_satellites.length > 0
          ? satData.all_satellites
          : satData.curated_top_10 || []
        : satData.curated_top_10 || []

    return source
      .filter((s) => {
        const lat = s.latitude ?? s.lat
        const lon = s.longitude ?? s.lng ?? s.lon
        return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
      })
      .filter((s) => {
        if (riskFilter === 'ALL') return true
        const lvl = String(s.level || '').toUpperCase()
        const target = riskFilter.toUpperCase()
        if (target === 'HIGH') return lvl === 'HIGH'
        if (target === 'MEDIUM') return lvl === 'MEDIUM' || lvl === 'NORMAL' || lvl === 'MED'
        if (target === 'LOW') return lvl === 'LOW'
        return true
      })
  }, [satData, viewMode, riskFilter])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main" style={{ position: 'relative' }}>
            <Topbar
              title="Globe Risk View"
              subtitle="Interactive 3D Earth with real-time risk-colored satellite markers and illustrative orbit paths"
            />

            <div
              className="card glass neon-border"
              style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                height: 'calc(100svh - 170px)',
                minHeight: 560,
              }}
            >
              <GlobeRiskScene
                className="globeRiskCanvas"
                satellites={displayedSatellites}
                selectedSatellite={selectedSatellite}
                onSelectSatellite={setSelectedSatellite}
              />

              {/* ── Top Bar Controls: View Toggle + Risk Level Filters ── */}
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  top: 16,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                  zIndex: 20,
                  background: 'rgba(10, 12, 25, 0.75)',
                  padding: '8px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* All / Curated Toggle */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      background: viewMode === 'all' ? 'rgba(34,211,238,0.25)' : 'transparent',
                      borderColor: viewMode === 'all' ? 'var(--neonC)' : 'rgba(255,255,255,0.1)',
                      color: viewMode === 'all' ? '#fff' : 'var(--muted)',
                    }}
                    onClick={() => setViewMode('all')}
                  >
                    All Satellites
                  </button>
                  <button
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      background: viewMode === 'curated' ? 'rgba(34,211,238,0.25)' : 'transparent',
                      borderColor: viewMode === 'curated' ? 'var(--neonC)' : 'rgba(255,255,255,0.1)',
                      color: viewMode === 'curated' ? '#fff' : 'var(--muted)',
                    }}
                    onClick={() => setViewMode('curated')}
                  >
                    Curated Top 10
                  </button>
                </div>

                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.14)' }} />

                {/* All / High / Medium / Low Risk Filter */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                    <button
                      key={lvl}
                      className="btn"
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                        background: riskFilter === lvl ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.03)',
                        borderColor:
                          riskFilter === lvl
                            ? lvl === 'HIGH'
                              ? 'var(--risk-high)'
                              : lvl === 'MEDIUM'
                              ? 'var(--risk-med)'
                              : lvl === 'LOW'
                              ? 'var(--risk-low)'
                              : 'var(--neonC)'
                            : 'rgba(255,255,255,0.1)',
                        color:
                          lvl === 'HIGH'
                            ? 'var(--risk-high)'
                            : lvl === 'MEDIUM'
                            ? 'var(--risk-med)'
                            : lvl === 'LOW'
                            ? 'var(--risk-low)'
                            : '#fff',
                      }}
                      onClick={() => setRiskFilter(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <button
                  className="btn"
                  onClick={() => loadData()}
                  disabled={isLoading}
                  title="Reload satellite data"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  <RefreshCw size={12} className={isLoading ? 'sfi-spin' : ''} />
                </button>
              </div>

              {/* Loading / Error indicator */}
              {(isLoading || error) && (
                <div
                  className="subtle"
                  style={{
                    position: 'absolute',
                    left: 16,
                    bottom: 38,
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    color: 'rgba(255, 255, 255, 0.75)',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    pointerEvents: 'none',
                    zIndex: 20,
                  }}
                >
                  {isLoading ? (
                    'Querying /api/helio-risk…'
                  ) : (
                    <span style={{ color: 'var(--risk-high)' }}>Error: {error}</span>
                  )}
                </div>
              )}

              {/* ── Illustrative Orbit Rings Labeling Requirement ── */}
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  bottom: 12,
                  fontSize: 10,
                  fontFamily: 'var(--mono)',
                  color: 'rgba(255, 255, 255, 0.45)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  zIndex: 20,
                }}
              >
                <Info size={11} />
                <span>
                  Orbit rings are illustrative based on telemetry altitude & coordinates (API telemetry does not provide full TLE orbital elements).
                </span>
              </div>

              <AnimatePresence>
                <SatelliteDetails
                  satellite={selectedSatellite}
                  onClose={() => setSelectedSatellite(null)}
                />
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
