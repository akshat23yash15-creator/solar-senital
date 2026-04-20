import { useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import GridRiskMap from '../components/GridRiskMap'
import { liveStats, suggestedActions } from '../utils/dummyData'
import '../styles/map.css'

export default function GridRiskPage() {
  const [level, setLevel] = useState('high')

  const actions = useMemo(() => suggestedActions[level], [level])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar title="MagStorm Shield — Grid Risk" subtitle="World map with heat-style risk overlays (dummy coords)" />

            <section className="grid">
              <div className="card" style={{ gridColumn: 'span 8', padding: 0 }}>
                <GridRiskMap />
              </div>

              <Motion.aside
                className="card glass neon-border"
                style={{ gridColumn: 'span 4' }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h3>Storm Panel</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="glass" style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="subtle" style={{ fontSize: 12 }}>
                      Storm ETA
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 750 }}>{liveStats.geomagneticStormEta}</div>
                    <div className="subtle" style={{ fontSize: 12, marginTop: 6 }}>
                      based on hardcoded model
                    </div>
                  </div>

                  <div className="glass" style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="subtle" style={{ fontSize: 12, marginBottom: 8 }}>
                      Operational mode
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['low', 'medium', 'high'].map((l) => (
                        <button
                          key={l}
                          className="btn"
                          onClick={() => setLevel(l)}
                          style={{
                            borderColor: level === l ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.16)',
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="glass" style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>Suggested actions</div>
                        <div className="subtle" style={{ fontSize: 12 }}>
                          for level: {level}
                        </div>
                      </div>
                      <div className="pill">
                        <span className="pill-dot" style={{ background: level === 'high' ? 'var(--risk-high)' : level === 'medium' ? 'var(--risk-med)' : 'var(--risk-low)' }} />
                        {level}
                      </div>
                    </div>
                    <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'rgba(255,255,255,0.74)' }}>
                      {actions.map((a) => (
                        <li key={a} style={{ margin: '6px 0' }}>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Motion.aside>
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
