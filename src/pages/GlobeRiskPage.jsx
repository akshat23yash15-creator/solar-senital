import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import SatelliteDetails from '../components/SatelliteDetails'
import GlobeRiskScene from '../components/GlobeRiskScene'

export default function GlobeRiskPage() {
  const [selectedSatellite, setSelectedSatellite] = useState(null)

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
                onSelectSatellite={setSelectedSatellite}
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
                Drag to rotate • Scroll to zoom • Click satellites for details
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
