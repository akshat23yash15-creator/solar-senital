import { useMemo } from 'react'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import { alerts, liveStats, satellites } from '../utils/dummyData'
import { riskLevelFromScore } from '../utils/risk'

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

export default function DashboardPage() {
  const leaderboard = useMemo(() => {
    return [...satellites]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map((s, idx) => ({ ...s, rank: idx + 1, level: riskLevelFromScore(s.riskScore) }))
  }, [])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar title="Operations Dashboard" subtitle="Real-time styled overview (hardcoded telemetry)" />

            <section className="grid">
              <StatCard label="Solar Wind" value={`${liveStats.solarWindSpeed} km/s`} accent="var(--neonC)" />
              <StatCard label="Kp Index" value={liveStats.kpIndex} accent="var(--neonA)" />
              <StatCard label="Flare" value={liveStats.flareClass} accent="var(--neonB)" />
              <StatCard label="Active Alerts" value={liveStats.activeAlerts} accent="var(--risk-med)" />

              <div className="card glass neon-border" style={{ gridColumn: 'span 7' }}>
                <h3>Satellite Risk Leaderboard</h3>
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
                      <tr key={s.name} className="rowHover">
                        <td style={{ color: 'var(--muted)' }}>{s.rank}</td>
                        <td style={{ fontWeight: 650 }}>{s.name}</td>
                        <td className="subtle">{s.orbit}</td>
                        <td>
                          <RiskBadge level={s.level} />
                        </td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{s.riskScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card glass neon-border" style={{ gridColumn: 'span 5' }}>
                <h3>Alerts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {alerts.map((a) => {
                    const badgeLevel = a.severity
                    return (
                      <Motion.div
                        key={a.id}
                        className="glass"
                        whileHover={{ y: -2 }}
                        style={{ padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700 }}>{a.title}</div>
                          <RiskBadge level={badgeLevel} />
                        </div>
                        <div className="subtle" style={{ fontSize: 13, marginTop: 6 }}>
                          {a.message}
                        </div>
                        <div className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                          {a.time}
                        </div>
                      </Motion.div>
                    )
                  })}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
