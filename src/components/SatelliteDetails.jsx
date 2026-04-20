import { motion as Motion } from 'framer-motion'
import RiskBadge from './RiskBadge'

export default function SatelliteDetails({ satellite, onClose }) {
  if (!satellite) return null

  return (
    <Motion.div
      className="glass neon-border"
      initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      style={{
        position: 'absolute',
        left: 18,
        bottom: 18,
        width: 'min(420px, calc(100% - 36px))',
        padding: 14,
        borderRadius: 18,
        zIndex: 5,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{satellite.name}</div>
          <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>
            Orbit: {satellite.orbit} • Age: {satellite.ageYears}y
          </div>
        </div>
        <button className="btn" onClick={onClose} aria-label="Close">
          Close
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="pill">
          <span className="pill-dot" style={{ background: 'var(--neonC)' }} />
          Risk Score: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{satellite.riskScore}</span>
        </div>
        <RiskBadge level={satellite.level} />
        <div className="pill">
          <span className="pill-dot" style={{ background: 'rgba(255,255,255,0.5)' }} />
          Status: <span style={{ fontWeight: 700 }}>{satellite.status}</span>
        </div>
      </div>

      <div className="subtle" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.45 }}>
        Demo note: details are hardcoded now. Later we’ll swap this with an API response + real telemetry streams.
      </div>
    </Motion.div>
  )
}
