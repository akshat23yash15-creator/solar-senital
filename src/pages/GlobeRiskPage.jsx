import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import SatelliteDetails from '../components/SatelliteDetails'
import GlobeRiskScene from '../components/GlobeRiskScene'
import { fetchHelioRiskSatellites } from '../utils/helioApi'

export default function GlobeRiskPage() {
  const [selectedSatellite, setSelectedSatellite] = useState(null)
  const [satellites, setSatellites] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const shuffleSatellites = (items) => {
    const list = [...items]
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = list[i]
      list[i] = list[j]
      list[j] = tmp
    }
    return list
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchHelioRiskSatellites()
        if (!cancelled) {
          const shuffled = shuffleSatellites(data)
          setSatellites(shuffled.slice(0, Math.min(30, shuffled.length)))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load satellites from API.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main" style={{ position: 'relative' }}>
            <Topbar
              title="Globe Risk View"
              subtitle="Realistic 3D Earth with risk-colored satellites, orbit paths, and click-to-inspect"
            />

            <div
              className="card glass neon-border"
              style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                height: 'calc(100svh - 170px)',
              }}
            >
              <GlobeRiskScene
                className="globeRiskCanvas"
                satellites={satellites}
                onSelectSatellite={setSelectedSatellite}
                staticSatellites
              />

              <div
                className="subtle"
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 12,
                  fontSize: 12,
                  pointerEvents: 'none',
                }}
              >
                {isLoading
                  ? 'Loading satellites from /api/helio-risk...'
                  : error
                    ? `Error: ${error}`
                    : 'Drag to rotate • Scroll to zoom • Click satellites for details'}
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
