import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import EarthScene from '../components/EarthScene'
import PageTransition from '../components/PageTransition'
import SatelliteDetails from '../components/SatelliteDetails'
import { useTelemetry } from '../context/TelemetryContext'
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
  const { solarWindSpeed, kpIndex, flareClass, stormEta, lastUpdated, loading, curatedTop10 } = useTelemetry()

  const stats = useMemo(
    () => [
      {
        label: 'Solar Wind',
        value: solarWindSpeed != null ? String(solarWindSpeed) : loading ? 'Syncing…' : 'Unavailable',
      },
      {
        label: 'Kp Index',
        value: kpIndex != null ? String(kpIndex) : loading ? 'Syncing…' : 'Unavailable',
      },
      {
        label: 'Flare Class',
        value: flareClass != null ? String(flareClass) : loading ? 'Syncing…' : 'Unavailable',
      },
      {
        label: 'Storm ETA',
        value: stormEta != null ? String(stormEta) : loading ? 'Syncing…' : 'Unavailable',
      },
    ],
    [solarWindSpeed, kpIndex, flareClass, stormEta, loading]
  )

  const updatedDisplay = lastUpdated
    ? new Date(lastUpdated).toUTCString().replace('GMT', 'UTC').slice(0, 25)
    : loading
    ? 'Connecting to live APIs…'
    : 'Telemetry offline'

  return (
    <PageTransition>
      <div className="home">
        <div className="canvasWrap">
          <EarthScene
            className="canvasWrap"
            satellites={curatedTop10}
            onSelectSatellite={setSelectedSatellite}
          />
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
                  A neon-grade, interactive command center for monitoring solar flare events, satellite risk,
                  and geomagnetic grid impact—powered by live telemetry from AI flare models, NOAA SWPC, and NORAD satellite networks.
                </p>
                <div className="heroActions">
                  <Link className="btn" to="/dashboard">
                    Enter Dashboard
                  </Link>
                  <Link
                    className="btn"
                    to="/flare-impact"
                    style={{ borderColor: 'rgba(34,211,238,0.5)', color: 'var(--neonC)' }}
                  >
                    Flare Impact Center
                  </Link>
                  <Link className="btn" to="/analytics">
                    Earth Threat Center
                  </Link>
                  <span className="pill" style={{ marginLeft: 4 }}>
                    <span
                      className="pill-dot"
                      style={{ background: loading ? 'var(--risk-med)' : 'var(--neonC)' }}
                    />
                    last updated: {updatedDisplay}
                  </span>
                </div>
                <div className="homeHint">
                  Interactive 3D Earth • Live solar, grid, and orbital satellite telemetry
                </div>
              </Motion.div>

              <Motion.aside
                className="floatingPanel glass neon-border"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: 'easeOut' }}
              >
                <h3 style={{ marginTop: 0 }}>Live Telemetry</h3>
                <div className="statGrid">
                  {stats.map((s) => (
                    <Stat key={s.label} label={s.label} value={s.value} />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <Link className="btn" to="/satellites">
                    Satellite Risk
                  </Link>
                  <Link className="btn" to="/grid-heatmap">
                    Heatmap
                  </Link>
                </div>

                <div className="homeHint" style={{ marginTop: 14 }}>
                  Streaming live telemetry from SolarSentinel neural flare prediction & geomagnetic infrastructure APIs.
                </div>
              </Motion.aside>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
