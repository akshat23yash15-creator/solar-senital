import { formatRiskLabel, riskColor } from '../utils/risk'

export default function RiskBadge({ level }) {
  const color = riskColor(level)
  return (
    <span
      className="pill"
      style={{
        borderColor: 'rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.22)',
      }}
    >
      <span className="pill-dot" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
      {formatRiskLabel(level)}
    </span>
  )
}
