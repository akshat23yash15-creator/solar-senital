import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { motion as Motion, AnimatePresence } from 'framer-motion'
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
  if (v === 'ORANGE')                    return '#ff7b22'
  if (v === 'YELLOW' || v === 'WARNING') return '#ffbf1f'
  return '#35f28c'
}

function circleRadius(value) {
  const v = parseFloat(value) || 0.1
  return Math.max(12, Math.min(60, v * 80))
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 7, { duration: 1.2 })
  }, [target, map])
  return null
}

/* ══════════════════════════════════════════════
   REGION DETAIL CARD
══════════════════════════════════════════════ */
function RegionDetailCard({ trigger }) {
  if (!trigger) return (
    <div style={{
      padding: '18px 16px', borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,0.04)',
      border: '1px dashed rgba(255,255,255,0.1)',
      color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--mono)',
      textAlign: 'center',
    }}>
      Select a region to view details
    </div>
  )

  const col    = alertColor(trigger.alert_level)
  const lvlUp  = String(trigger.alert_level || '').toUpperCase()
  const isHot  = lvlUp === 'RED' || lvlUp === 'CRITICAL'
  const badgeBg = isHot ? 'rgba(255,59,59,0.18)' : lvlUp === 'YELLOW' || lvlUp === 'WARNING' ? 'rgba(255,191,31,0.18)' : 'rgba(53,242,140,0.18)'

  const fields = [
    { label: 'Alert Level', value: trigger.alert_level || 'OK' },
    { label: 'Risk Value',  value: trigger.value != null ? String(trigger.value) : '—' },
    { label: 'Latitude',    value: trigger.lat != null ? `${Number(trigger.lat).toFixed(4)}° N` : '—' },
    { label: 'Longitude',   value: trigger.lng != null ? `${Number(trigger.lng).toFixed(4)}° E` : '—' },
  ]

  return (
    <Motion.div
      key={trigger.region}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={{
        padding: '16px 18px', borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,0,0,0.15))',
        border: `1px solid ${col}44`,
        boxShadow: isHot ? `0 0 20px ${col}22` : 'none',
      }}
    >
      {/* Region name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{trigger.region}</div>
        <span style={{
          fontSize: 10, fontWeight: 750, fontFamily: 'var(--mono)',
          color: col, background: badgeBg, padding: '3px 10px',
          borderRadius: 999, border: `1px solid ${col}55`,
          letterSpacing: '0.5px',
          animation: isHot ? 'mgPulse 1.8s ease-in-out infinite' : 'none',
        }}>
          {trigger.alert_level || 'OK'}
        </span>
      </div>

      {/* Colour-coded left stripe */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{ width: 3, borderRadius: 3, background: col, marginRight: 14, flexShrink: 0 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', flex: 1 }}>
          {fields.map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3 }}>
                {f.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 650, fontFamily: 'var(--mono)', color: f.label === 'Alert Level' ? col : 'var(--text)' }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coords row */}
      <div style={{ marginTop: 12, fontSize: 10, color: 'var(--muted2)', fontFamily: 'var(--mono)' }}>
        Map coordinates: {Number(trigger.lat).toFixed(4)}° N, {Number(trigger.lng).toFixed(4)}° E
      </div>
    </Motion.div>
  )
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function GridRiskMapPage() {
  const { mode }                = useMagStormMode()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [flyTarget, setFlyTarget] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [dropdownOpen, setDropdownOpen]     = useState(false)

  const fetchData = useCallback(async (currentMode, signal) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(
        `https://solar-sentinel-v2.onrender.com/api/v1/infrastructure/impact?mode=${currentMode}`,
        { signal }
      )
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

  const triggers       = data?.grid_heatmap_triggers ?? []
  const sevColor       = data?.storm_metadata?.severity_color || null
  const mapBorderColor = sevColor || 'rgba(255,255,255,0.12)'

  const handleSelectRegion = (t) => {
    setSelectedRegion(t)
    setFlyTarget({ lat: t.lat, lng: t.lng })
    setDropdownOpen(false)
  }

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
        /* Blinking heatmap circles */
        @keyframes heatBlink {
          0%,100%{ fill-opacity: 0.45; }
          50%    { fill-opacity: 0.15; }
        }
        .heat-blink { animation: heatBlink 2.2s ease-in-out infinite; }
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
                    display: 'inline-block', animation: 'mgPulse 2s ease-in-out infinite',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── MAP (full width) ── */}
                <div style={{
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: `1.5px solid ${mapBorderColor}88`,
                  height: 480,
                  boxShadow: `0 0 28px ${mapBorderColor}22`,
                }}>
                  <MapContainer center={[22.5, 80]} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
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
                            border: `2px solid ${color}88`, borderRadius: 10, padding: '14px 16px',
                            boxShadow: `0 0 20px ${color}44`,
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color }}>{t.region}</div>
                            <div style={{
                              display: 'inline-block', fontSize: 10, fontWeight: 750,
                              color, background: `${color}22`, padding: '2px 8px',
                              borderRadius: 999, border: `1px solid ${color}55`, marginBottom: 8,
                            }}>{t.alert_level || 'OK'}</div>
                            <div style={{ fontSize: 12, marginBottom: 4, color: '#aaa' }}>
                              Value: <strong style={{ color: '#fff' }}>{t.value}</strong>
                            </div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 6, fontFamily: 'monospace' }}>
                              {Number(t.lat).toFixed(4)}° N, {Number(t.lng).toFixed(4)}° E
                            </div>
                          </div>
                        </Popup>
                      )
                      return (
                        <React.Fragment key={i}>
                          {isPulse && (
                            <CircleMarker center={[t.lat, t.lng]} radius={radius + 14}
                              pathOptions={{ color, fillColor: 'transparent', fillOpacity: 0, weight: 2, className: 'ms-ring-pulse' }} />
                          )}
                          {isPulse && (
                            <CircleMarker center={[t.lat, t.lng]} radius={radius + 6}
                              pathOptions={{ color, fillColor: 'transparent', fillOpacity: 0, weight: 1, opacity: 0.45 }} />
                          )}
                          {/* Blinking filled marker for all alert levels */}
                          <CircleMarker
                            center={[t.lat, t.lng]}
                            radius={radius}
                            pathOptions={{
                              color,
                              fillColor: color,
                              fillOpacity: isPulse ? 0.45 : 0.3,
                              weight: isPulse ? 2.5 : 1.5,
                              className: 'heat-blink',
                            }}
                          >
                            {popup}
                          </CircleMarker>
                        </React.Fragment>
                      )
                    })}
                  </MapContainer>
                </div>

                {/* ── DROPDOWN + DETAIL ROW ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, alignItems: 'start' }}>

                  {/* Dropdown selector */}
                  <div>
                    <div
                      onClick={() => setDropdownOpen(o => !o)}
                      style={{
                        padding: '11px 14px', borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.15))',
                        border: '1px solid rgba(255,255,255,0.14)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 10,
                        userSelect: 'none',
                        transition: 'border-color 150ms',
                      }}
                    >
                      <span style={{ fontSize: 13, color: selectedRegion ? 'var(--text)' : 'var(--muted)', fontWeight: selectedRegion ? 650 : 400 }}>
                        {selectedRegion ? selectedRegion.region : 'Select a region…'}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
                        <path d="M2 4l4 4 4-4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <Motion.div
                          initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
                          animate={{ opacity: 1, y: 0, scaleY: 1 }}
                          exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            marginTop: 4, borderRadius: 'var(--radius-sm)',
                            background: 'rgba(10,12,25,0.97)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: 'var(--shadow-md)',
                            overflow: 'hidden',
                            maxHeight: 280, overflowY: 'auto',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(34,211,238,0.18) transparent',
                            zIndex: 1000, position: 'relative',
                          }}
                        >
                          {triggers.length === 0 ? (
                            <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>No regions available</div>
                          ) : triggers.map((t, i) => {
                            const col   = alertColor(t.alert_level)
                            const isSelected = selectedRegion?.region === t.region
                            return (
                              <div
                                key={i}
                                onClick={() => handleSelectRegion(t)}
                                style={{
                                  padding: '10px 14px', cursor: 'pointer',
                                  background: isSelected ? 'rgba(255,255,255,0.07)' : 'transparent',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                                  transition: 'background 120ms',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(255,255,255,0.07)' : 'transparent'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: col, boxShadow: `0 0 5px ${col}`,
                                    display: 'inline-block', flexShrink: 0,
                                  }} />
                                  <span style={{ fontSize: 13, fontWeight: isSelected ? 650 : 400 }}>{t.region}</span>
                                </div>
                                <span style={{
                                  fontSize: 9, fontWeight: 750, fontFamily: 'var(--mono)',
                                  color: col, background: `${col}18`,
                                  padding: '2px 7px', borderRadius: 999, border: `1px solid ${col}44`,
                                  letterSpacing: '0.5px',
                                }}>
                                  {t.alert_level || 'OK'}
                                </span>
                              </div>
                            )
                          })}
                        </Motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Region detail card */}
                  <RegionDetailCard trigger={selectedRegion} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
