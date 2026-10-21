import { useMemo } from 'react'
import { useTelemetry } from '../context/TelemetryContext'

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
  const { solarWindSpeed, kpIndex, stormClass, loading, infraData } = useTelemetry()

  const derived = useMemo(() => {
    const kpNum = Number(kpIndex)
    const storm = stormClass
      ? stormClass
      : Number.isFinite(kpNum)
      ? kpNum >= 6
        ? 'Storm'
        : kpNum >= 4
        ? 'Elevated'
        : 'Nominal'
      : loading
      ? 'Syncing…'
      : 'Unavailable'

    const speedNum = parseFloat(solarWindSpeed)
    const link = infraData?.pipeline_status
      ? infraData.pipeline_status
      : Number.isFinite(speedNum)
      ? speedNum >= 600
        ? 'Degrading'
        : 'Stable'
      : loading
      ? 'Syncing…'
      : 'Offline'

    return {
      storm,
      link,
      speedText: solarWindSpeed != null ? String(solarWindSpeed) : loading ? 'Syncing…' : 'Unavailable',
      kpText: kpIndex != null ? String(kpIndex) : loading ? 'Syncing…' : 'Unavailable',
    }
  }, [solarWindSpeed, kpIndex, stormClass, loading, infraData])

  return (
    <header className="topbar glass neon-border">
      <div className="topbarTitle">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbarRight">
        <StatusPill
          label="Solar Wind"
          value={derived.speedText}
          color="var(--neonB)"
        />
        <StatusPill
          label="Kp"
          value={derived.kpText}
          color="var(--neonA)"
        />
        <StatusPill
          label="Ops"
          value={derived.link}
          color="var(--neonC)"
        />
        <StatusPill
          label="Storm"
          value={derived.storm}
          color={
            derived.storm === 'Storm' || derived.storm === 'CRITICAL'
              ? 'var(--risk-high)'
              : derived.storm === 'Elevated' || derived.storm === 'WARNING'
              ? 'var(--risk-med)'
              : 'var(--risk-low)'
          }
        />
      </div>
    </header>
  )
}
