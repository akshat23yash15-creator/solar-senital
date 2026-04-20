import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import EarthScene from '../components/EarthScene'
import PageTransition from '../components/PageTransition'
import SatelliteDetails from '../components/SatelliteDetails'
import { liveStats } from '../utils/dummyData'
import '../styles/home.css'

function Stat({ label, value }) {
  return (
    <div className="statItem">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
    </div>
  )
}

export default function HomePage() {
  const [selectedSatellite, setSelectedSatellite] = useState(null)

  const stats = useMemo(
    () => [
      { label: 'Solar Wind', value: `${liveStats.solarWindSpeed} km/s` },
      { label: 'Kp Index', value: liveStats.kpIndex },
      { label: 'Flare Class', value: liveStats.flareClass },
      { label: 'Storm ETA', value: liveStats.geomagneticStormEta },
    ],
    []
  )

  return (
    <PageTransition>
      <div className="home">
        <div className="canvasWrap">
          <EarthScene className="canvasWrap" onSelectSatellite={setSelectedSatellite} />
        </div>

        <AnimatePresence>
          <SatelliteDetails satellite={selectedSatellite} onClose={() => setSelectedSatellite(null)} />
        </AnimatePresence>

        <div className="homeOverlay">
          <div className="container">
            <div className="heroGrid">
              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              >
                <h1 className="heroTitle">SolarSentinel — Real-Time Space Weather Intelligence</h1>
                <p className="heroSub">
                  A neon-grade, interactive command center for monitoring solar events, satellite risk, and geomagnetic grid impact.
                  Built for visual impact: 3D Earth, charts, and a global risk map—powered by hardcoded demo telemetry.
                </p>
                <div className="heroActions">
                  <Link className="btn" to="/dashboard">
                    Enter Dashboard
                  </Link>
                  <Link className="btn" to="/analytics">
                    View Analytics
                  </Link>
                  <span className="pill" style={{ marginLeft: 4 }}>
                    <span className="pill-dot" style={{ background: 'var(--neonC)' }} />
                    last updated: {liveStats.lastUpdated}
                  </span>
                </div>
                <div className="homeHint">Drag to rotate • Scroll to zoom • Red/Yellow/Green satellites indicate risk</div>
              </Motion.div>

              <Motion.aside
                className="floatingPanel glass neon-border"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: 'easeOut' }}
              >
                <h3 style={{ marginTop: 0 }}>Live Stats</h3>
                <div className="statGrid">
                  {stats.map((s) => (
                    <Stat key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <Link className="btn" to="/satellites">
                    Satellite Risk
                  </Link>
                  <Link className="btn" to="/grid-risk">
                    Grid Risk
                  </Link>
                </div>

                <div className="homeHint" style={{ marginTop: 14 }}>
                  Scoring in this demo is static. In production, this would stream telemetry + space weather models.
                </div>
              </Motion.aside>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
