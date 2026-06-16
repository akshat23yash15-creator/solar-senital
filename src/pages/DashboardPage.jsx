import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Sun } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import AIPredictionPanel from '../components/AIPredictionPanel'
import { useSolarPrediction } from '../context/SolarPredictionContext'
import { alerts, liveStats } from '../utils/dummyData'
import { fetchHelioRiskSatellites } from '../utils/helioApi'

// ── Inline mini-bar chart for satellite risk scores ──────────────────────────
function SatRiskMiniChart({ satellites }) {
  if (!satellites.length) return null
  const top8 = satellites.slice(0, 8)
  const max = 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top8.map((s, i) => {
        const pct = Math.min(100, Math.max(0, s.riskScore))
        const hex = s.riskScore >= 70 ? '#ff3b3b' : s.riskScore >= 50 ? '#ffbf1f' : '#35f28c'
        return (
          <Motion.div
            key={s.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 24 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            {/* Name */}
            <div style={{
              width: 130, fontSize: 11, fontFamily: 'var(--mono)',
              color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {s.name}
            </div>
            {/* Bar */}
            <div style={{
              flex: 1, height: 8, borderRadius: 999,
              background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${(pct / max) * 100}%`,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${hex}88, ${hex})`,
                boxShadow: pct >= 70 ? `0 0 6px ${hex}88` : 'none',
                transition: 'width 700ms ease',
              }} />
            </div>
            {/* Score */}
            <div style={{
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
              color: hex, minWidth: 32, textAlign: 'right', flexShrink: 0,
            }}>
              {s.riskScore}
            </div>
          </Motion.div>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <Motion.div
      className="card glass neon-border"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      style={{ gridColumn: 'span 3', minHeight: 92 }}
    >
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent, boxShadow: `0 0 20px ${accent}` }} />
      </h3>
      <div style={{ fontSize: 22, fontWeight: 750 }}>{value}</div>
      <div className="subtle" style={{ fontSize: 12, marginTop: 6 }}>
        updated {liveStats.lastUpdated}
      </div>
    </Motion.div>
  )
}

// ── AI Stat Card (driven by prediction) ──────────────────────────────────────

function AIStatCard({ label, value, accent, sub }) {
  return (
    <Motion.div
      className="card glass neon-border"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      style={{ gridColumn: 'span 3', minHeight: 92 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent, boxShadow: `0 0 16px ${accent}` }} />
      </h3>
      <div style={{ fontSize: 20, fontWeight: 750, color: accent }}>{value}</div>
      {sub && <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </Motion.div>
  )
}

export default function DashboardPage() {
  const [satellites, setSatellites] = useState([])
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState('')

  const { prediction, predicting } = useSolarPrediction()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchHelioRiskSatellites()
        if (!cancelled) setSatellites(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load satellites from API.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const leaderboard = useMemo(() => {
    return [...satellites]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map((s, idx) => ({ ...s, rank: idx + 1 }))
  }, [satellites])

  // Derive accent colors for AI cards
  const riskAccent = prediction
    ? prediction.riskLevel === 'HIGH'
      ? 'var(--risk-high)'
      : prediction.riskLevel === 'MEDIUM'
      ? 'var(--risk-med)'
      : 'var(--risk-low)'
    : 'var(--muted)'

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar title="Operations Dashboard" subtitle="Real-time telemetry + AI solar flare prediction" />

            <section className="grid">
              {/* Existing telemetry cards */}
              <StatCard label="Solar Wind"    value={`${liveStats.solarWindSpeed} km/s`} accent="var(--neonC)" />
              <StatCard label="Kp Index"      value={liveStats.kpIndex}                  accent="var(--neonA)" />
              <StatCard label="Flare"         value={liveStats.flareClass}                accent="var(--neonB)" />
              <StatCard label="Active Alerts" value={liveStats.activeAlerts}              accent="var(--risk-med)" />

              {/* ── AI Prediction Cards (update dynamically) ── */}
              {prediction ? (
                <>
                  <AIStatCard
                    label="AI Flare Class"
                    value={prediction.flareClass}
                    accent={riskAccent}
                    sub="Latest AI scan"
                  />
                  <AIStatCard
                    label="AI Risk Level"
                    value={prediction.riskLevel}
                    accent={riskAccent}
                    sub={`Confidence: ${prediction.confidenceScore?.toFixed(1) ?? '—'}%`}
                  />
                  <AIStatCard
                    label="Predicted Log Flux"
                    value={prediction.predictedLogFlux != null ? prediction.predictedLogFlux.toFixed(2) : '—'}
                    accent="var(--neonC)"
                    sub="W/m² (log₁₀)"
                  />
                  <AIStatCard
                    label="Region"
                    value={prediction.anomaly?.regionName ?? 'Stable Matrix'}
                    accent="var(--neonB)"
                    sub={`Quadrant: ${prediction.anomaly?.quadrant ?? 'None'}`}
                  />
                </>
              ) : (
                <Motion.div
                  className="card glass neon-border"
                  style={{ gridColumn: 'span 12', padding: 14 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sun size={15} strokeWidth={1.75} color="var(--neonC)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {predicting
                        ? 'AI scan in progress — results will appear here momentarily…'
                        : 'No AI prediction yet. Use the Solar System page or panel below to run a live or manual scan.'}
                    </span>
                  </div>
                </Motion.div>
              )}

              {/* ── AI Prediction Panel ── */}
              <Motion.div
                className="card glass neon-border"
                style={{ gridColumn: 'span 12' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <AIPredictionPanel />
              </Motion.div>

              {/* ── Satellite Leaderboard ── */}
              <div className="card glass neon-border" style={{ gridColumn: 'span 7' }}>
                <h3>Satellite Risk Leaderboard</h3>
                {isLoading ? (
                  <div className="subtle" style={{ fontSize: 13 }}>Loading satellites from /api/helio-risk…</div>
                ) : error ? (
                  <div className="subtle" style={{ fontSize: 13, color: 'var(--risk-high)' }}>{error}</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Orbit</th>
                        <th>Risk</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((s) => (
                        <tr key={s.id} className="rowHover">
                          <td style={{ color: 'var(--muted)' }}>{s.rank}</td>
                          <td style={{ fontWeight: 650 }}>{s.name}</td>
                          <td className="subtle">{s.orbit}</td>
                          <td><RiskBadge level={s.level} /></td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{s.riskScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Right column: Risk Profile Chart + Alerts ── */}
              <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Satellite Risk Profile mini bar chart */}
                <div className="card glass neon-border">
                  <h3 style={{ marginBottom: 14 }}>Satellite Risk Profile</h3>
                  {isLoading ? (
                    <div className="subtle" style={{ fontSize: 13 }}>Loading…</div>
                  ) : error ? (
                    <div className="subtle" style={{ fontSize: 13, color: 'var(--risk-high)' }}>{error}</div>
                  ) : (
                    <SatRiskMiniChart satellites={satellites} />
                  )}
                </div>

                {/* Alerts */}
                <div className="card glass neon-border">
                  <h3>Alerts</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {alerts.map((a) => (
                      <Motion.div
                        key={a.id}
                        className="glass"
                        whileHover={{ y: -2 }}
                        style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700 }}>{a.title}</div>
                          <RiskBadge level={a.severity} />
                        </div>
                        <div className="subtle" style={{ fontSize: 13, marginTop: 6 }}>{a.message}</div>
                        <div className="subtle" style={{ fontSize: 12, marginTop: 8 }}>{a.time}</div>
                      </Motion.div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
