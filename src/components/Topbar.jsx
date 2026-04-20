import { useMemo } from 'react'
import { liveStats } from '../utils/dummyData'

function StatusPill({ label, value, color }) {
  return (
    <div className="pill" title={label}>
      <span className="pill-dot" style={{ background: color }} />
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 650 }}>{value}</span>
    </div>
  )
}

export default function Topbar({ title, subtitle }) {
  const derived = useMemo(() => {
    const storm = liveStats.kpIndex >= 6 ? 'Storm' : liveStats.kpIndex >= 4 ? 'Elevated' : 'Nominal'
    return {
      storm,
      link: liveStats.solarWindSpeed >= 600 ? 'Degrading' : 'Stable',
    }
  }, [])

  return (
    <header className="topbar glass neon-border">
      <div className="topbarTitle">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbarRight">
        <StatusPill label="Solar Wind" value={`${liveStats.solarWindSpeed} km/s`} color="var(--neonB)" />
        <StatusPill label="Kp" value={liveStats.kpIndex} color="var(--neonA)" />
        <StatusPill label="Ops" value={derived.link} color="var(--neonC)" />
        <StatusPill
          label="Storm"
          value={derived.storm}
          color={derived.storm === 'Storm' ? 'var(--risk-high)' : derived.storm === 'Elevated' ? 'var(--risk-med)' : 'var(--risk-low)'}
        />
      </div>
    </header>
  )
}
