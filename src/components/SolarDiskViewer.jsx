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
  const numX = hasCoords ? Number(rawX) : null
  const numY = hasCoords ? Number(rawY) : null

  const activeQuadKey = typeof quadrant === 'string' ? quadrant.trim().toUpperCase() : 'NONE'
  const isQuadValid = ['NW', 'NE', 'SW', 'SE'].includes(activeQuadKey)
  const isNamedAnomaly = regionName && regionName !== 'Stable Matrix' && regionName !== 'None'
  const isClassAlert = (flareClass && flareClass !== 'Quiet' && flareClass !== 'Nominal' && flareClass !== '—') ||
                       (riskLevel && riskLevel.toUpperCase() !== 'LOW')

  const isActiveAnomaly = isNamedAnomaly || isQuadValid || isClassAlert || (hasCoords && ((numX ?? 0) > 0 || (numY ?? 0) > 0))

  // Quadrant geometric centers (well clear of borders and corner tags)
  const QUADRANT_CENTERS = {
    NW: { x: 28, y: 28 },
    NE: { x: 72, y: 28 },
    SW: { x: 28, y: 72 },
    SE: { x: 72, y: 72 },
  }

  // Determine display coordinates:
  // If coordinates are explicitly given and not (0,0), clamp them inside [16%, 84%]
  // If coordinates are (0,0) or missing but a quadrant is known, use the quadrant center
  let targetX = 50
  let targetY = 50

  if (hasCoords && (numX > 0 || numY > 0)) {
    targetX = numX
    targetY = numY
  } else if (isQuadValid && QUADRANT_CENTERS[activeQuadKey]) {
    targetX = QUADRANT_CENTERS[activeQuadKey].x
    targetY = QUADRANT_CENTERS[activeQuadKey].y
  } else if (hasCoords) {
    // Both are 0 and no known quadrant
    targetX = 50
    targetY = 50
  }

  // Clamp within solar disk container so reticle (38px + ping) is 100% inside the viewport
  const displayX = Math.min(84, Math.max(16, targetX))
  const displayY = Math.min(84, Math.max(16, targetY))

  // Dynamic tooltip alignment so it never clips off-screen
  const tooltipAbove = displayY >= 36
  const tooltipAlign = displayX < 32 ? 'left' : displayX > 68 ? 'right' : 'center'

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
          {(isActiveAnomaly || hasCoords) && (
            <div
              className="sfi-anomaly-reticle"
              style={{
                left: `${displayX}%`,
                top: `${displayY}%`,
              }}
              onClick={() => setShowTooltip((s) => !s)}
            >
              <div
                className="sfi-reticle-ring"
                style={{
                  borderColor: isActiveAnomaly ? '#ff3b3b' : 'var(--neonC)',
                  boxShadow: isActiveAnomaly ? '0 0 16px #ff3b3b' : '0 0 14px var(--neonC)',
                }}
              />
              {isActiveAnomaly && <div className="sfi-reticle-ping" />}
              <div
                className="sfi-reticle-center"
                style={{
                  background: isActiveAnomaly ? '#ff3b3b' : 'var(--neonC)',
                  boxShadow: isActiveAnomaly ? '0 0 12px #ff3b3b' : '0 0 8px var(--neonC)',
                }}
              />

              <AnimatePresence>
                {showTooltip && (
                  <Motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="sfi-reticle-tooltip"
                    style={{
                      borderColor: isActiveAnomaly ? '#ff3b3b' : 'var(--neonC)',
                      boxShadow: isActiveAnomaly ? '0 4px 20px rgba(255, 59, 59, 0.4)' : '0 4px 18px rgba(34, 211, 238, 0.3)',
                      ...(tooltipAbove
                        ? { bottom: 'calc(100% + 10px)', top: 'auto' }
                        : { top: 'calc(100% + 10px)', bottom: 'auto' }),
                      ...(tooltipAlign === 'left'
                        ? { left: 0, transform: 'none' }
                        : tooltipAlign === 'right'
                        ? { right: 0, left: 'auto', transform: 'none' }
                        : { left: '50%', transform: 'translateX(-50%)' }),
                    }}
                  >
                    <strong>{regionName}</strong>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                      {hasCoords && (numX > 0 || numY > 0)
                        ? `X: ${numX}% · Y: ${numY}%`
                        : isQuadValid
                        ? `Quadrant: ${quadrant}`
                        : `Coords: ${displayX}% / ${displayY}%`}
                      {quadrant && quadrant !== 'None' && ` (${quadrant})`}
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
                <strong style={{ color: '#fff' }}>{quadrant}</strong>
                {hasCoords && (numX > 0 || numY > 0) ? ` at (${numX}%, ${numY}%)` : ''}.
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
