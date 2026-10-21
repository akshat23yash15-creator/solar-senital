import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Sun, AlertTriangle, CheckCircle, Plane } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import AIPredictionPanel from '../components/AIPredictionPanel'
import { useSolarPrediction } from '../context/SolarPredictionContext'
import { useTelemetry } from '../context/TelemetryContext'
import { fetchHelioRiskSatellites } from '../utils/helioApi'

// ── Inline mini-bar chart for satellite risk scores ──────────────────────────
function SatRiskMiniChart({ satellites }) {
  if (!satellites || !satellites.length) return null
  const top8 = satellites.slice(0, 8)
  const max = 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {top8.map((s, i) => {
        const score = Number(s.risk_score ?? s.riskScore) || 0
        const pct = Math.min(100, Math.max(0, score))
        const hex = score >= 70 ? '#ff3b3b' : score >= 50 ? '#ffbf1f' : '#35f28c'
        return (
          <Motion.div
            key={s.id || s.name || i}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 24 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            {/* Name */}
            <div
              style={{
                width: 130,
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {s.name}
            </div>
            {/* Bar */}
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(pct / max) * 100}%`,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${hex}88, ${hex})`,
                  boxShadow: pct >= 70 ? `0 0 6px ${hex}88` : 'none',
                  transition: 'width 700ms ease',
                }}
              />
            </div>
            {/* Score */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--mono)',
                color: hex,
                minWidth: 32,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {score.toFixed(1)}
            </div>
          </Motion.div>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, accent, updated }) {
  return (
    <Motion.div
      className="card glass neon-border"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      style={{ gridColumn: 'span 3', minHeight: 92 }}
    >
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 20px ${accent}`,
          }}
        />
      </h3>
      <div style={{ fontSize: 22, fontWeight: 750 }}>{value}</div>
      <div className="subtle" style={{ fontSize: 12, marginTop: 6 }}>
        {updated ? `updated ${updated}` : 'real-time stream'}
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
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 16px ${accent}`,
          }}
        />
      </h3>
      <div style={{ fontSize: 20, fontWeight: 750, color: accent }}>{value}</div>
      {sub && <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </Motion.div>
  )
}

export default function DashboardPage() {
  const [satellites, setSatellites] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const { prediction, predicting } = useSolarPrediction()
  const { solarWindSpeed, kpIndex, flareClass, aviationAlerts, lastUpdated, loading: teleLoading } =
    useTelemetry()

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
    return () => {
      cancelled = true
    }
  }, [])

  const leaderboard = useMemo(() => {
    return [...satellites]
      .sort((a, b) => (Number(b.risk_score ?? b.riskScore) || 0) - (Number(a.risk_score ?? a.riskScore) || 0))
      .slice(0, 10)
      .map((s, idx) => ({ ...s, rank: idx + 1 }))
  }, [satellites])

  // Derive accent colors for AI cards
  const riskAccent = prediction
    ? String(prediction.riskLevel).toUpperCase() === 'HIGH'
      ? 'var(--risk-high)'
      : String(prediction.riskLevel).toUpperCase() === 'MEDIUM'
      ? 'var(--risk-med)'
      : 'var(--risk-low)'
    : 'var(--muted)'

  const timeFormatted = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : null

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar
              title="Operations Dashboard"
              subtitle="Real-time telemetry + AI solar flare prediction"
            />

            <section className="grid">
              {/* Telemetry cards from real APIs */}
              <StatCard
                label="Solar Wind"
                value={
                  solarWindSpeed != null ? String(solarWindSpeed) : teleLoading ? 'Syncing…' : 'Unavailable'
                }
                accent="var(--neonC)"
                updated={timeFormatted}
              />
              <StatCard
                label="Kp Index"
                value={kpIndex != null ? String(kpIndex) : teleLoading ? 'Syncing…' : 'Unavailable'}
                accent="var(--neonA)"
                updated={timeFormatted}
              />
              <StatCard
                label="Flare"
                value={flareClass != null ? String(flareClass) : teleLoading ? 'Syncing…' : 'Unavailable'}
                accent="var(--neonB)"
                updated={timeFormatted}
              />
              <StatCard
                label="Active Alerts"
                value={
                  aviationAlerts ? String(aviationAlerts.length) : teleLoading ? 'Syncing…' : '0'
                }
                accent="var(--risk-med)"
                updated={timeFormatted}
              />

              {/* ── AI Prediction Cards (update dynamically) ── */}
              {prediction ? (
                <>
                  <AIStatCard
                    label="AI Flare Class"
                    value={prediction.flareClass || prediction.flare_class || '—'}
                    accent={riskAccent}
                    sub="Latest AI scan"
                  />
                  <AIStatCard
                    label="AI Risk Level"
                    value={prediction.riskLevel || prediction.risk_level || 'LOW'}
                    accent={riskAccent}
                    sub={`Confidence: ${(prediction.confidenceScore ?? prediction.confidence_score)?.toFixed?.(1) ?? '—'}%`}
                  />
                  <AIStatCard
                    label="Predicted Log Flux"
                    value={
                      prediction.predictedLogFlux != null || prediction.predicted_log_flux != null
                        ? Number(prediction.predictedLogFlux ?? prediction.predicted_log_flux).toFixed(2)
                        : '—'
                    }
                    accent="var(--neonC)"
                    sub="W/m² (log₁₀)"
                  />
                  <AIStatCard
                    label="Region"
                    value={prediction.anomaly?.regionName ?? prediction.anomaly_localization?.region_name ?? 'Stable Matrix'}
                    accent="var(--neonB)"
                    sub={`Quadrant: ${prediction.anomaly?.quadrant ?? prediction.anomaly_localization?.quadrant ?? 'None'}`}
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
                      {leaderboard.map((s) => {
                        const score = Number(s.risk_score ?? s.riskScore) || 0
                        return (
                          <tr key={s.id} className="rowHover">
                            <td style={{ color: 'var(--muted)' }}>{s.rank}</td>
                            <td style={{ fontWeight: 650 }}>{s.name}</td>
                            <td className="subtle">{s.orbit}</td>
                            <td><RiskBadge level={s.level} /></td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{score.toFixed(1)}</td>
                          </tr>
                        )
                      })}
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

                {/* Real Live Alerts */}
                <div className="card glass neon-border">
                  <h3>Active Aviation & Corridor Alerts</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {aviationAlerts && aviationAlerts.length > 0 ? (
                      aviationAlerts.map((a, idx) => {
                        const statusUpper = String(a.status || '').toUpperCase()
                        const badgeLvl =
                          statusUpper === 'WARNING'
                            ? 'medium'
                            : statusUpper === 'RE-ROUTED' || statusUpper === 'CRITICAL'
                            ? 'high'
                            : 'low'

                        return (
                          <Motion.div
                            key={a.route_id || idx}
                            className="glass"
                            whileHover={{ y: -2 }}
                            style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                                <Plane size={14} color="var(--neonC)" />
                                <span>{a.route_id}</span>
                              </div>
                              <RiskBadge level={badgeLvl} />
                            </div>
                            <div className="subtle" style={{ fontSize: 13, marginTop: 6 }}>
                              {a.action || 'Optimal signal strength. Normal operations.'}
                            </div>
                            <div className="subtle" style={{ fontSize: 11, marginTop: 8, fontFamily: 'var(--mono)' }}>
                              Status: {a.status}
                            </div>
                          </Motion.div>
                        )
                      })
                    ) : teleLoading ? (
                      <div className="subtle" style={{ fontSize: 13 }}>Loading live corridor alerts…</div>
                    ) : (
                      <div className="glass" style={{ padding: 14, borderRadius: 16, textAlign: 'center', color: 'var(--muted)' }}>
                        <CheckCircle size={20} color="var(--risk-low)" style={{ margin: '0 auto 6px' }} />
                        <div style={{ fontSize: 13 }}>No active emergency alerts. Corridors nominal.</div>
                      </div>
                    )}
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
