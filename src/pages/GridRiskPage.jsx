import { useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import GridRiskMap from '../components/GridRiskMap'
import { useTelemetry } from '../context/TelemetryContext'
import '../styles/map.css'

export default function GridRiskPage() {
  const { stormEta, gridTriggers, automatedActions, loading } = useTelemetry()
  const [level, setLevel] = useState('high')

  // Real actions from API 2 + severity level guidance
  const actionsForLevel = useMemo(() => {
    if (automatedActions && automatedActions.length > 0) {
      return automatedActions
    }
    // Dynamic operational actions according to standard space weather protocols
    const protocolActions = {
      high: [
        'Engage GIC protective neutral grounding reactors on transmission lines',
        'Reduce base-load transformer thermal loading by 15-20%',
        'Prepare backup gas turbines for rapid reactive power injection',
        'Maintain emergency telecommunication channels with regional load dispatch centers',
      ],
      medium: [
        'Monitor transformer core vibration and neutral current telemetry',
        'Verify supervisory control and data acquisition (SCADA) telemetry integrity',
        'Postpone non-critical substation routine maintenance maneuvers',
      ],
      low: [
        'Maintain nominal bulk grid transmission topology',
        'Keep automated alerting thresholds and sensor logs active',
      ],
    }
    return protocolActions[level] || protocolActions.low
  }, [automatedActions, level])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar
              title="MagStorm Shield — Grid Risk"
              subtitle="Regional power grid telemetry with geomagnetic induction heat-style overlays"
            />

            <section className="grid">
              <div className="card" style={{ gridColumn: 'span 8', padding: 0 }}>
                <GridRiskMap triggers={gridTriggers} />
              </div>

              <Motion.aside
                className="card glass neon-border"
                style={{ gridColumn: 'span 4' }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h3>Storm Panel</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    className="glass"
                    style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="subtle" style={{ fontSize: 12 }}>
                      Storm ETA
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 750 }}>
                      {stormEta != null ? String(stormEta) : loading ? 'Calculating…' : 'Nominal'}
                    </div>
                    <div className="subtle" style={{ fontSize: 12, marginTop: 6 }}>
                      from solar wind & CME transit model
                    </div>
                  </div>

                  <div
                    className="glass"
                    style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                  >
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

                  <div
                    className="glass"
                    style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>Suggested actions</div>
                        <div className="subtle" style={{ fontSize: 12 }}>
                          for level: {level}
                        </div>
                      </div>
                      <div className="pill">
                        <span
                          className="pill-dot"
                          style={{
                            background:
                              level === 'high'
                                ? 'var(--risk-high)'
                                : level === 'medium'
                                ? 'var(--risk-med)'
                                : 'var(--risk-low)',
                          }}
                        />
                        {level}
                      </div>
                    </div>
                    <ul
                      style={{
                        margin: '10px 0 0',
                        paddingLeft: 18,
                        color: 'rgba(255,255,255,0.74)',
                      }}
                    >
                      {actionsForLevel.map((a, i) => (
                        <li key={i} style={{ margin: '6px 0' }}>
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
