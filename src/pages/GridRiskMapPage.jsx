import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import { useMagStormMode } from '../context/MagStormContext'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'

/* ── helpers ── */
function alertColor(level) {
  if (!level) return '#35f28c'
  const v = String(level).toUpperCase()
  if (v === 'RED' || v === 'CRITICAL')   return '#ff3b3b'
  if (v === 'YELLOW' || v === 'WARNING') return '#ffbf1f'
  return '#35f28c'
}

function circleRadius(value) {
  const v = parseFloat(value) || 0.1
  return Math.max(12, Math.min(60, v * 80))
}

/* flies map to a location */
function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 8, { duration: 1.2 })
  }, [target, map])
  return null
}

/* ── legend ── */
function Legend() {
  const items = [
    { color: '#35f28c', label: 'Safe (GREEN)' },
    { color: '#ffbf1f', label: 'Warning (YELLOW)' },
    { color: '#ff3b3b', label: 'Critical (RED)' },
  ]
  return (
    <div className="glass" style={{
      padding: '14px 16px', borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <span style={{ fontSize: 11, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>
        Alert Level
      </span>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            background: color, display: 'inline-block',
            boxShadow: `0 0 6px ${color}`,
          }} />
          <span style={{ fontSize: 13 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function GridRiskMapPage() {
  const { mode } = useMagStormMode()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)

  const fetchData = useCallback(async (currentMode, signal) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`/api/v1/infrastructure/impact?mode=${currentMode}`, { signal })
      setData(res.data)
    } catch (err) {
      if (!axios.isCancel(err)) setError(err.message || 'Failed to load map data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    fetchData(mode, ctrl.signal)
    const iv = setInterval(() => fetchData(mode, ctrl.signal), 30_000)
    return () => { ctrl.abort(); clearInterval(iv) }
  }, [mode, fetchData])

  const triggers      = data?.grid_heatmap_triggers ?? []
  const sevColor       = data?.storm_metadata?.severity_color || null
  const mapBorderColor = sevColor || 'rgba(255,255,255,0.12)'

  return (
    <PageTransition>
      <style>{`
        @keyframes mapPulse  { 0%,100%{opacity:.85;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
        @keyframes mgPulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes mgSpin    { to{transform:rotate(360deg)} }
        @keyframes ringPulse { 0%,100%{stroke-opacity:0.7;fill-opacity:0} 50%{stroke-opacity:0.1;fill-opacity:0} }
        .leaflet-container { background: #090b1a !important; }
        .leaflet-tile { filter: brightness(0.72) saturate(0.8) hue-rotate(200deg); }
        .ms-ring-pulse { animation: ringPulse 2s ease-in-out infinite; }
      `}</style>

      <div className="container" style={{ padding: '18px 0 40px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <header className="topbar glass neon-border" style={{ marginBottom: 18 }}>
              <div className="topbarTitle">
                <h1>Grid Risk Heatmap</h1>
                <p>Grid infrastructure alerts — India focus</p>
              </div>
              <div className="topbarRight">
                <div className="pill">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: mode === 'live' ? 'var(--risk-low)' : 'var(--risk-high)',
                    display: 'inline-block',
                    animation: 'mgPulse 2s ease-in-out infinite',
                  }} />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>Mode</span>
                  <span style={{
                    fontWeight: 650, fontFamily: 'var(--mono)', fontSize: 12,
                    color: mode === 'live' ? 'var(--risk-low)' : 'var(--risk-high)',
                    textTransform: 'uppercase',
                  }}>{mode}</span>
                </div>
                <div className="pill">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neonC)', display: 'inline-block' }} />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>Regions</span>
                  <span style={{ fontWeight: 650 }}>{triggers.length}</span>
                </div>
              </div>
            </header>

            {loading && !data && (
              <div className="glass" style={{ padding: 24, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div aria-hidden style={{
                  width: 26, height: 26, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderTopColor: 'var(--neonC)',
                  animation: 'mgSpin 900ms linear infinite', flexShrink: 0,
                }} />
                <span className="subtle">Loading grid data…</span>
              </div>
            )}

            {!loading && error && (
              <div className="glass" style={{ padding: 18, borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--risk-high)', marginBottom: 18 }}>
                <span style={{ color: 'var(--risk-high)', fontSize: 14 }}>{error}</span>
              </div>
            )}

            {data && (
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'start' }}>

                {/* ── REGION SIDEBAR ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="card glass neon-border">
                    <h3 style={{ marginBottom: 12 }}>Regions</h3>
                    {triggers.length === 0 ? (
                      <span className="subtle" style={{ fontSize: 13 }}>No triggers.</span>
                    ) : triggers.map((t, i) => {
                      const col      = alertColor(t.alert_level)
                      const lvlUpper = String(t.alert_level || '').toUpperCase()
                      const isRed    = lvlUpper === 'RED' || lvlUpper === 'CRITICAL'
                      const isYellow = lvlUpper === 'YELLOW' || lvlUpper === 'WARNING'
                      const badgeBg  = isRed ? 'rgba(255,59,59,0.2)' : isYellow ? 'rgba(255,191,31,0.2)' : 'rgba(53,242,140,0.2)'
                      return (
                        <Motion.button
                          key={i}
                          onClick={() => setFlyTarget({ lat: t.lat, lng: t.lng })}
                          whileHover={{ x: 3 }}
                          style={{
                            width: '100%', textAlign: 'left', cursor: 'pointer',
                            background: isRed ? 'rgba(255,59,59,0.06)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${col}${isRed ? '66' : '33'}`,
                            borderRadius: 10, padding: '10px 12px',
                            marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 650, fontSize: 13 }}>{t.region}</span>
                            <span style={{
                              fontSize: 9, fontWeight: 750, fontFamily: 'var(--mono)',
                              color: col, background: badgeBg, padding: '2px 7px',
                              borderRadius: 999, border: `1px solid ${col}55`,
                              letterSpacing: '0.5px',
                              animation: isRed ? 'mgPulse 1.8s ease-in-out infinite' : 'none',
                            }}>
                              {t.alert_level || 'OK'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: col, fontFamily: 'var(--mono)' }}>
                            Value: {t.value}
                          </span>
                        </Motion.button>
                      )
                    })}
                  </div>
                  <Legend />
                </div>

                {/* ── MAP ── */}
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1.5px solid ${mapBorderColor}88`, height: 500, boxShadow: `0 0 28px ${mapBorderColor}22` }}>
                  <MapContainer
                    center={[22.5, 80]}
                    zoom={5}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© OpenStreetMap'
                    />
                    {flyTarget && <FlyTo target={flyTarget} />}

                    {triggers.map((t, i) => {
                      const color   = alertColor(t.alert_level)
                      const lvlUp   = String(t.alert_level || '').toUpperCase()
                      const isPulse = lvlUp === 'RED' || lvlUp === 'CRITICAL'
                      const radius  = circleRadius(t.value)
                      const popup = (
                        <Popup>
                          <div style={{
                            fontFamily: 'monospace', minWidth: 180,
                            background: '#0b0d1c', color: '#e0e0e0',
                            border: `2px solid ${color}88`,
                            borderRadius: 10, padding: '14px 16px',
                            boxShadow: `0 0 20px ${color}44`,
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: color }}>
                              {t.region}
                            </div>
                            <div style={{
                              display: 'inline-block', fontSize: 10, fontWeight: 750,
                              color, background: `${color}22`, padding: '2px 8px',
                              borderRadius: 999, border: `1px solid ${color}55`, marginBottom: 8,
                            }}>
                              {t.alert_level || 'OK'}
                            </div>
                            <div style={{ fontSize: 12, marginBottom: 4, color: '#aaa' }}>
                              Value: <strong style={{ color: '#fff' }}>{t.value}</strong>
                            </div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 6, fontFamily: 'monospace' }}>
                              {t.lat.toFixed(4)}° N, {t.lng.toFixed(4)}° E
                            </div>
                          </div>
                        </Popup>
                      )
                      return (
                        <React.Fragment key={i}>
                          {/* Outer pulse ring (RED/CRITICAL only) */}
                          {isPulse && (
                            <CircleMarker
                              center={[t.lat, t.lng]}
                              radius={radius + 14}
                              pathOptions={{
                                color,
                                fillColor: 'transparent',
                                fillOpacity: 0,
                                weight: 2,
                                className: 'ms-ring-pulse',
                              }}
                            />
                          )}
                          {/* Secondary ring */}
                          {isPulse && (
                            <CircleMarker
                              center={[t.lat, t.lng]}
                              radius={radius + 6}
                              pathOptions={{
                                color,
                                fillColor: 'transparent',
                                fillOpacity: 0,
                                weight: 1,
                                opacity: 0.45,
                              }}
                            />
                          )}
                          {/* Inner filled marker */}
                          <CircleMarker
                            center={[t.lat, t.lng]}
                            radius={radius}
                            pathOptions={{
                              color,
                              fillColor: color,
                              fillOpacity: isPulse ? 0.45 : 0.3,
                              weight: isPulse ? 2.5 : 1.5,
                            }}
                          >
                            {popup}
                          </CircleMarker>
                        </React.Fragment>
                      )
                    })}
                  </MapContainer>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
