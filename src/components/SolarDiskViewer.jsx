import React, { useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { Sun, AlertCircle, Target, Info, Crosshair } from 'lucide-react'

export default function SolarDiskViewer({ anomalyLocalization, riskLevel, flareClass }) {
  const [showTooltip, setShowTooltip] = useState(true)

  const regionName = anomalyLocalization?.region_name ?? 'Stable Matrix'
  const quadrant = anomalyLocalization?.quadrant ?? 'None'
  const rawX = anomalyLocalization?.x_coordinate_percent
  const rawY = anomalyLocalization?.y_coordinate_percent

  const hasCoords = rawX !== undefined && rawY !== undefined && rawX !== null && rawY !== null
  const xPercent = hasCoords ? Math.min(100, Math.max(0, Number(rawX))) : 50
  const yPercent = hasCoords ? Math.min(100, Math.max(0, Number(rawY))) : 50

  const isActiveAnomaly = hasCoords && (xPercent > 0 || yPercent > 0) && quadrant !== 'None'
  const activeQuadKey = typeof quadrant === 'string' ? quadrant.trim().toUpperCase() : 'NONE'

  return (
    <div className="sfi-solar-layout">
      {/* ── Solar Disk Telemetry Coordinate Matrix ── */}
      <div className="sfi-solar-viewport-card">
        <div
          className="sfi-solar-disk-wrap"
          style={{
            background: 'radial-gradient(circle at center, #1b120c 0%, #0c080e 65%, #05040a 100%)',
            border: '1px solid rgba(255, 140, 0, 0.25)',
            boxShadow: '0 0 35px rgba(255, 120, 0, 0.12), inset 0 0 30px rgba(0,0,0,0.8)',
          }}
          title="Solar Disk Coordinate Matrix (Plotted from API Telemetry)"
        >
          {/* Concentric Solar Radial Reference Rings */}
          <div
            style={{
              position: 'absolute',
              inset: '12%',
              borderRadius: '50%',
              border: '1px dashed rgba(255, 180, 50, 0.18)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '28%',
              borderRadius: '50%',
              border: '1px solid rgba(255, 180, 50, 0.12)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '42%',
              borderRadius: '50%',
              border: '1px dashed rgba(255, 180, 50, 0.2)',
              pointerEvents: 'none',
            }}
          />

          {/* Solar Equator & Meridian Crosshairs */}
          <div className="sfi-solar-crosshair-h" />
          <div className="sfi-solar-crosshair-v" />

          {/* Center Solar Core Marker */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255, 200, 50, 0.4)',
              pointerEvents: 'none',
            }}
          />

          {/* Quadrant labels */}
          <div
            className={`sfi-quadrant-tag nw ${activeQuadKey === 'NW' ? 'active-quad' : ''}`}
            style={{
              borderColor: activeQuadKey === 'NW' ? 'var(--risk-high)' : 'rgba(255,255,255,0.15)',
              color: activeQuadKey === 'NW' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: activeQuadKey === 'NW' ? 'rgba(255,59,59,0.35)' : 'rgba(0,0,0,0.6)',
            }}
          >
            NW (Q2)
          </div>
          <div
            className={`sfi-quadrant-tag ne ${activeQuadKey === 'NE' ? 'active-quad' : ''}`}
            style={{
              borderColor: activeQuadKey === 'NE' ? 'var(--risk-high)' : 'rgba(255,255,255,0.15)',
              color: activeQuadKey === 'NE' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: activeQuadKey === 'NE' ? 'rgba(255,59,59,0.35)' : 'rgba(0,0,0,0.6)',
            }}
          >
            NE (Q1)
          </div>
          <div
            className={`sfi-quadrant-tag sw ${activeQuadKey === 'SW' ? 'active-quad' : ''}`}
            style={{
              borderColor: activeQuadKey === 'SW' ? 'var(--risk-high)' : 'rgba(255,255,255,0.15)',
              color: activeQuadKey === 'SW' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: activeQuadKey === 'SW' ? 'rgba(255,59,59,0.35)' : 'rgba(0,0,0,0.6)',
            }}
          >
            SW (Q3)
          </div>
          <div
            className={`sfi-quadrant-tag se ${activeQuadKey === 'SE' ? 'active-quad' : ''}`}
            style={{
              borderColor: activeQuadKey === 'SE' ? 'var(--risk-high)' : 'rgba(255,255,255,0.15)',
              color: activeQuadKey === 'SE' ? '#fff' : 'rgba(255,255,255,0.45)',
              background: activeQuadKey === 'SE' ? 'rgba(255,59,59,0.35)' : 'rgba(0,0,0,0.6)',
            }}
          >
            SE (Q4)
          </div>

          {/* Anomaly coordinate reticle marker */}
          {hasCoords && (
            <div
              className="sfi-anomaly-reticle"
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
              }}
              onClick={() => setShowTooltip((s) => !s)}
            >
              <div
                className="sfi-reticle-ring"
                style={{
                  borderColor: isActiveAnomaly ? '#ff3b3b' : 'var(--neonC)',
                  boxShadow: isActiveAnomaly ? '0 0 14px #ff3b3b' : '0 0 14px var(--neonC)',
                }}
              />
              {isActiveAnomaly && <div className="sfi-reticle-ping" />}
              <div
                className="sfi-reticle-center"
                style={{
                  background: isActiveAnomaly ? '#ff3b3b' : 'var(--neonC)',
                  boxShadow: isActiveAnomaly ? '0 0 10px #ff3b3b' : '0 0 8px var(--neonC)',
                }}
              />

              <AnimatePresence>
                {showTooltip && (
                  <Motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="sfi-reticle-tooltip"
                    style={{
                      borderColor: isActiveAnomaly ? '#ff3b3b' : 'var(--neonC)',
                    }}
                  >
                    <strong>{regionName}</strong>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      X: {xPercent}% · Y: {yPercent}% ({quadrant})
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Compass / Solar Disk Header Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              fontFamily: 'var(--mono)',
              color: 'rgba(255, 200, 100, 0.7)',
              background: 'rgba(0,0,0,0.6)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(255, 180, 50, 0.2)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            SOLAR COORDINATE SPACE (0-100%)
          </div>
        </div>

        {/* Distinct Solar vs Earth disclaimer & API data note */}
        <div className="sfi-coord-disclaimer">
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>API Data Notice:</strong> The flare prediction endpoint returns numerical region coordinates and quadrants (not an image stream). Plotted above in Solar Disk coordinate space; distinct from Earth terrestrial coordinates.
          </span>
        </div>
      </div>

      {/* ── Text Anomaly Details ── */}
      <div className="sfi-anomaly-details">
        <div className="sfi-detail-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crosshair size={16} color="var(--neonC)" />
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750, color: '#fff' }}>
              Anomaly Localization Telemetry
            </h4>
          </div>

          <div className="sfi-detail-row">
            <span className="sfi-detail-k">Region Name</span>
            <span className="sfi-detail-v">{regionName}</span>
          </div>

          <div className="sfi-detail-row">
            <span className="sfi-detail-k">Quadrant</span>
            <span
              className="sfi-detail-v"
              style={{
                color: isActiveAnomaly ? 'var(--risk-med)' : 'var(--neonC)',
              }}
            >
              {quadrant}
            </span>
          </div>

          <div className="sfi-detail-row">
            <span className="sfi-detail-k">X Coordinate</span>
            <span className="sfi-detail-v">
              {rawX !== undefined && rawX !== null ? `${rawX}%` : '—'}
            </span>
          </div>

          <div className="sfi-detail-row">
            <span className="sfi-detail-k">Y Coordinate</span>
            <span className="sfi-detail-v">
              {rawY !== undefined && rawY !== null ? `${rawY}%` : '—'}
            </span>
          </div>

          <div className="sfi-detail-row">
            <span className="sfi-detail-k">Surface Status</span>
            <span
              className="sfi-detail-v"
              style={{
                color: isActiveAnomaly ? 'var(--risk-high)' : 'var(--risk-low)',
              }}
            >
              {isActiveAnomaly ? 'Active Solar Perturbation' : 'Quiet Solar Surface (Baseline)'}
            </span>
          </div>
        </div>

        <div className="sfi-detail-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sun size={15} color="#ffbf1f" />
            <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--text)' }}>
              Solar Flare AI Model Localization
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            {isActiveAnomaly ? (
              <>
                Neural prediction identifies magnetic energy elevation in{' '}
                <strong style={{ color: '#fff' }}>{regionName}</strong> in quadrant{' '}
                <strong style={{ color: '#fff' }}>{quadrant}</strong> at ({xPercent}%, {yPercent}%).
              </>
            ) : (
              <>
                Coronal flux telemetry exhibits baseline levels with no localized high-energy flaring anomalies. Current quadrant status: <strong style={{ color: '#fff' }}>{quadrant}</strong>.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
