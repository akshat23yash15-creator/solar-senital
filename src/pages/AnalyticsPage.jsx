/**
 * AnalyticsPage.jsx  —  Earth Threat Center  (refined)
 * Layout preserved. Upgrades:
 *  S1: Animated Sun→Earth particle impact path + ETA countdown
 *  S2: Map scan sweep + corner brackets (Leaflet preserved)
 *  S3: Orbit-grouped satellites, mission-control cards, risk badges
 *  S6: Live activity feed (new, uses existing API data)
 */

import React, {
  useCallback, useEffect, useRef, useState
} from 'react'
import axios from 'axios'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  Activity, AlertTriangle, Navigation, RefreshCw,
  Radio, Satellite, Zap, Wifi
} from 'lucide-react'

import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { normalizeSatellite } from '../utils/helioApi'

import 'leaflet/dist/leaflet.css'
import '../styles/map.css'
import '../styles/earthThreat.css'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const API_V3 = 'https://solar-sentinel-v3.onrender.com'
const API_V2 = 'https://solar-sentinel-v2.onrender.com'
const API_V1 = 'https://solar-sentinel-1.onrender.com'
const REFRESH_MS = 60_000

// ─────────────────────────────────────────────────────────────────────────────
// Dev-mode response logger — logs full API payloads so field mappings can be
// verified without any production side-effects.
// ─────────────────────────────────────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV

function logApiResponse(label, data) {
  if (!IS_DEV) return
  console.groupCollapsed(`[EarthThreatCenter] ${label}`)
  console.log('Full payload:', data)
  // Log the exact fields this component cares about
  if (label === 'POST /api/v1/ai/predict-live') {
    console.log('── Mapped fields ──────────────────────────────')
    console.log('  live_telemetry.kp_index    :', data?.live_telemetry?.kp_index)
    console.log('  live_telemetry.speed       :', data?.live_telemetry?.speed)
    console.log('  storm_metadata.storm_class :', data?.storm_metadata?.storm_class)
    console.log('  storm_metadata.formatted_eta:', data?.storm_metadata?.formatted_eta)
    console.log('  storm_metadata.severity_color:', data?.storm_metadata?.severity_color)
    console.log('  flare_class                :', data?.flare_class)
    console.log('  risk_level                 :', data?.risk_level)
    console.log('  confidence_score           :', data?.confidence_score)
  }
  if (label === 'GET /api/v1/infrastructure/impact') {
    console.log('  grid_heatmap_triggers count:', data?.grid_heatmap_triggers?.length)
    console.log('  aviation_alerts count      :', data?.aviation_alerts?.length)
    console.log('  storm_metadata.severity_color:', data?.storm_metadata?.severity_color)
  }
  if (label === 'GET /api/helio-risk') {
    console.log('  curated_top_10 count       :', data?.curated_top_10?.length)
    console.log('  metadata                   :', data?.metadata)
  }
  console.groupEnd()
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
function threatPalette(riskLevel, kp) {
  const r = String(riskLevel ?? '').toUpperCase()
  if (r === 'HIGH'   || (kp != null && kp >= 7)) return { hex: '#ff3b3b', label: 'HIGH' }
  if (r === 'MEDIUM' || (kp != null && kp >= 4)) return { hex: '#ffbf1f', label: 'MEDIUM' }
  return { hex: '#35f28c', label: 'LOW' }
}

function alertHex(level) {
  if (!level) return '#35f28c'
  const v = String(level).toUpperCase()
  if (v === 'RED'    || v === 'CRITICAL') return '#ff3b3b'
  if (v === 'ORANGE'                    ) return '#ff7b22'
  if (v === 'YELLOW' || v === 'WARNING' ) return '#ffbf1f'
  return '#35f28c'
}

function aviHex(status) {
  if (!status) return '#888'
  const v = String(status).toUpperCase()
  if (v === 'NOMINAL') return '#35f28c'
  if (v === 'WARNING') return '#ffbf1f'
  return '#ff3b3b'
}

function scoreHex(score) {
  if (score >= 70) return '#ff3b3b'
  if (score >= 50) return '#ffbf1f'
  return '#35f28c'
}

function circleR(value) {
  const v = parseFloat(value) || 0.1
  return Math.max(10, Math.min(52, v * 70))
}

function fmtNow() {
  return new Date().toUTCString().replace('GMT', 'UTC').slice(0, 25)
}

function fmtTime() {
  return new Date().toISOString().slice(11, 19) + ' UTC'
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared atoms
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="etc-section-label">
      <span className="etc-section-label-dot" />
      {Icon && <Icon size={11} strokeWidth={2} style={{ flexShrink: 0 }} />}
      {children}
    </div>
  )
}

function LoadingBar({ text = 'Fetching data...' }) {
  return (
    <div className="etc-loading-bar">
      <span className="etc-spinner" />
      {text}
    </div>
  )
}

function ErrorBar({ text }) {
  return (
    <div className="etc-error-bar">
      <AlertTriangle size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      {text}
    </div>
  )
}

function RefreshBtn({ loading, onClick, label = 'Refresh' }) {
  return (
    <button className="etc-refresh-btn" onClick={onClick} disabled={loading} aria-label={label}>
      <RefreshCw size={10} strokeWidth={2} className={loading ? 'etc-refresh-spin' : ''} />
      {label}
    </button>
  )
}

function Timestamp({ ts }) {
  if (!ts) return null
  return (
    <div className="etc-timestamp">
      <span className="etc-timestamp-dot" />
      {ts}
    </div>
  )
}

// Skeleton shimmer for a single stat card while data is in-flight
function StatSkeleton({ label }) {
  return (
    <div className="etc-hero-stat" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="etc-hero-stat-label">{label}</div>
      <div style={{
        height: 22, width: '60%', borderRadius: 6,
        background: 'rgba(255,255,255,0.07)',
        animation: 'etcSkeletonPulse 1.4s ease-in-out infinite',
        marginTop: 2,
      }} />
      <div style={{
        height: 10, width: '40%', borderRadius: 4,
        background: 'rgba(255,255,255,0.04)',
        animation: 'etcSkeletonPulse 1.4s ease-in-out 0.2s infinite',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sun→Earth animated impact path  (pure SVG, no extra deps)
// ─────────────────────────────────────────────────────────────────────────────

function ImpactPath({ orbHex, etaLabel, loading = false }) {
  const pathData = 'M 30,36 C 120,10 280,62 370,36'
  const delays   = [0, 0.8, 1.6, 2.4, 3.2]

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* ETA row */}
      <div className="etc-eta-inline">
        <span style={{ color: 'var(--muted)' }}>Impact ETA</span>
        {loading
          ? <span style={{
              display: 'inline-block', width: 80, height: 14, borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
              animation: 'etcSkeletonPulse 1.4s ease-in-out infinite',
            }} />
          : <span className="etc-eta-value" style={{ color: orbHex }}>
              {etaLabel || 'Not available'}
            </span>
        }
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${orbHex}44,transparent)`, borderRadius: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>SUN</span>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>EARTH</span>
      </div>

      {/* SVG canvas */}
      <svg
        className="etc-impact-canvas"
        viewBox="0 0 400 72"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          {/* Glowing path gradient */}
          <linearGradient id="etcPathGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={orbHex} stopOpacity="0.6" />
            <stop offset="60%"  stopColor={orbHex} stopOpacity="0.3" />
            <stop offset="100%" stopColor={orbHex} stopOpacity="0.1" />
          </linearGradient>
          {/* Filter: glow */}
          <filter id="etcGlow" x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Hidden path for motion */}
          <path id="etcImpactPath" d={pathData} />
        </defs>

        {/* Faint guide path */}
        <path
          d={pathData}
          fill="none"
          stroke={`${orbHex}28`}
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        {/* Glowing path */}
        <path
          d={pathData}
          fill="none"
          stroke="url(#etcPathGrad)"
          strokeWidth="1.5"
          filter="url(#etcGlow)"
        />

        {/* Sun orb */}
        <circle cx="30" cy="36" r="11"
          fill={`${orbHex}18`}
          stroke={`${orbHex}99`}
          strokeWidth="1.5"
          filter="url(#etcGlow)"
        />
        <circle cx="30" cy="36" r="6"
          fill={orbHex}
          opacity="0.9"
          filter="url(#etcGlow)"
        />
        {/* Sun rays (4 lines) */}
        {[[30,21,30,14],[30,51,30,58],[15,36,8,36],[45,36,52,36]].map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={orbHex} strokeWidth="1.2" opacity="0.55" />
        ))}

        {/* Earth orb */}
        <circle cx="370" cy="36" r="12"
          fill={`rgba(34,100,255,0.18)`}
          stroke="rgba(34,211,238,0.7)"
          strokeWidth="1.5"
          filter="url(#etcGlow)"
        />
        <circle cx="370" cy="36" r="7"
          fill="rgba(34,130,255,0.55)"
        />
        {/* Earth ring */}
        <ellipse cx="370" cy="36" rx="15" ry="5"
          fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8"
        />

        {/* Animated particles */}
        {delays.map((delay, i) => (
          <circle
            key={i}
            r={i % 2 === 0 ? 3 : 2}
            fill={orbHex}
            opacity="0"
            style={{
              offsetPath: `path('${pathData}')`,
              motionPath: `path('${pathData}')`,
              animation: `etcParticle 4s ${delay}s ease-in-out infinite`,
              filter: `drop-shadow(0 0 3px ${orbHex})`,
            }}
          />
        ))}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — National Threat Status  (upgraded hero)
// ─────────────────────────────────────────────────────────────────────────────
function ThreatHero({ data, infra, loading, error, onRefresh, ts }) {
  // ── Field mapping ─────────────────────────────────────────────────────────
  // live_telemetry (kp_index, speed) comes from infra: GET /api/v1/infrastructure/impact
  // flare_class, risk_level, confidence_score come from data: POST /api/v1/ai/predict-live
  // storm_metadata (storm_class, formatted_eta, severity_color) comes from infra
  const kp           = infra?.live_telemetry?.kp_index          ?? null
  const windSpeed    = infra?.live_telemetry?.speed              ?? null
  const stormClass   = infra?.storm_metadata?.storm_class        ?? data?.storm_metadata?.storm_class ?? null
  const formattedEta = infra?.storm_metadata?.formatted_eta      ?? data?.storm_metadata?.formatted_eta ?? null
  const sevColor     = infra?.storm_metadata?.severity_color     ?? data?.storm_metadata?.severity_color ?? null
  const flareClass   = data?.flare_class                         ?? null
  const riskLevel    = data?.risk_level                          ?? null
  const confidence   = data?.confidence_score                    ?? null

  // Consider the hero "loaded" when either source has arrived
  const anyData = data != null || infra != null

  const palette = threatPalette(riskLevel, kp)
  const orbHex  = sevColor || palette.hex
  const pct     = confidence != null ? Math.min(100, Math.max(0, confidence)) : null

  // value=null → skeleton (still loading), value=string → show it
  const statDefs = [
    {
      label: 'Kp Index',
      value: anyData ? (kp != null ? String(kp) : 'N/A') : null,
      unit: 'geomagnetic',
      color: orbHex,
    },
    {
      label: 'Solar Wind',
      value: anyData ? (windSpeed != null ? `${windSpeed} km/s` : 'N/A') : null,
      unit: 'km / s',
      color: 'var(--neonC)',
    },
    {
      label: 'Storm Class',
      value: anyData ? (stormClass || 'NOMINAL') : null,
      unit: 'classification',
      color: orbHex,
    },
    {
      label: 'Flare Class',
      value: anyData ? (flareClass || 'None') : null,
      unit: 'x-ray burst',
      color: '#ffbf1f',
    },
  ]

  return (
    <Motion.div
      className="etc-hero glass neon-border"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      style={{
        gridColumn: 'span 12',
        boxShadow: anyData
          ? `0 0 60px ${orbHex}1a, 0 0 120px ${orbHex}0b, var(--shadow-md)`
          : 'var(--shadow-md)',
        border: `1px solid ${anyData ? orbHex + '44' : 'var(--stroke)'}`,
      }}
    >
      <div className="etc-hero-scanline" />

      {/* Top row */}
      <div className="etc-hero-top">
        {/* Orb — shows Kp or a spinner while loading */}
        <div className="etc-status-orb-wrap">
          <div className="etc-status-orb" style={{
            background: `${orbHex}15`,
            border: `2px solid ${orbHex}80`,
            boxShadow: `0 0 32px ${orbHex}55, inset 0 0 18px ${orbHex}18`,
            color: orbHex,
          }}>
            {loading && !anyData
              ? <span className="etc-spinner" style={{ width: 28, height: 28 }} />
              : <span className="etc-status-orb-value">
                  {kp != null ? kp : anyData ? 'N/A' : '?'}
                </span>
            }
          </div>
          <div className="etc-status-orb-ring"  style={{ borderColor: `${orbHex}38` }} />
          <div className="etc-status-orb-ring2" style={{ borderColor: `${orbHex}18` }} />
        </div>

        {/* Titles */}
        <div className="etc-hero-meta">
          <div className="etc-hero-label">Solar Sentinel — Earth Threat Center</div>
          <div className="etc-hero-title" style={{ color: orbHex }}>
            {loading && !anyData
              ? 'Scanning...'
              : error && !anyData
              ? 'Connection Error'
              : palette.label + ' THREAT LEVEL'
            }
          </div>
          <div className="etc-hero-sub">
            {loading && !anyData
              ? 'Contacting telemetry endpoints...'
              : error && !anyData
              ? error
              : stormClass && stormClass !== 'NOMINAL'
              ? `Storm Class: ${stormClass}`
              : 'Monitoring space weather conditions'
            }
          </div>
          {anyData && (
            <span className="etc-hero-badge" style={{
              background: `${orbHex}1a`, border: `1px solid ${orbHex}55`, color: orbHex,
            }}>
              {palette.label}
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <RefreshBtn loading={loading} onClick={onRefresh} label="Scan Now" />
            <Timestamp ts={ts} />
          </div>
        </div>
      </div>

      {/* Impact path — always render so layout doesn't jump */}
      <ImpactPath orbHex={orbHex} etaLabel={formattedEta} loading={loading && !anyData} />

      {/* ── Stat cards — ALWAYS rendered; skeletons while loading ── */}
      <div className="etc-hero-stats">
        {statDefs.map(s => (
          s.value === null
            ? <StatSkeleton key={s.label} label={s.label} />
            : (
              <div key={s.label} className="etc-hero-stat" style={{
                '--stat-accent': s.color,
                borderColor: `${s.color}20`,
              }}>
                <div className="etc-hero-stat-label">{s.label}</div>
                <div className="etc-hero-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="etc-hero-stat-unit">{s.unit}</div>
              </div>
            )
        ))}

        {/* Confidence bar — skeleton while loading */}
        {(loading && !anyData)
          ? (
            <div className="etc-hero-stat" style={{ gridColumn: 'span 2', borderColor: 'rgba(34,211,238,0.1)' }}>
              <div className="etc-hero-stat-label">AI Confidence</div>
              <div style={{
                height: 4, borderRadius: 999,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden', marginTop: 8,
              }}>
                <div style={{
                  height: '100%', width: '60%', borderRadius: 999,
                  background: 'rgba(34,211,238,0.15)',
                  animation: 'etcSkeletonPulse 1.4s ease-in-out infinite',
                }} />
              </div>
            </div>
          )
          : pct != null && (
            <div className="etc-hero-stat" style={{
              gridColumn: 'span 2',
              '--stat-accent': 'var(--neonC)',
              borderColor: 'rgba(34,211,238,0.16)',
            }}>
              <div className="etc-hero-stat-label">AI Confidence</div>
              <div className="etc-confidence">
                <div className="etc-confidence-label">
                  <span>Model certainty</span>
                  <span style={{ color: 'var(--neonC)' }}>{pct.toFixed(1)}%</span>
                </div>
                <div className="etc-confidence-track">
                  <div className="etc-confidence-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )
        }
      </div>

      {/* Error bar — shown only when both sources have failed */}
      {error && !anyData && !loading && <ErrorBar text={`Scan failed: ${error}`} />}
    </Motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — India Grid Defence Network  (upgraded Leaflet map)
// ─────────────────────────────────────────────────────────────────────────────
function GridDefenceMap({ triggers, loading, error, sevColor }) {
  const borderColor = sevColor || 'rgba(255,255,255,0.12)'

  return (
    <Motion.div
      className="card glass neon-border"
      style={{ gridColumn: 'span 7', padding: '16px 16px 0' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionLabel icon={Radio}>India Grid Defence Network</SectionLabel>
        <div className="etc-timestamp" style={{ marginBottom: 14 }}>
          <span className="etc-timestamp-dot" />
          {triggers.length} region{triggers.length !== 1 ? 's' : ''} monitored
        </div>
      </div>

      {loading && !triggers.length && <LoadingBar text="Loading grid triggers..." />}
      {error   && !triggers.length && <ErrorBar text={error} />}

      <div className="etc-map-wrap" style={{ border: `1.5px solid ${borderColor}55` }}>
        {/* Scanning sweep overlay */}
        <div className="etc-map-scan" />
        {/* Corner brackets */}
        <div className="etc-map-corner etc-map-corner-tl" />
        <div className="etc-map-corner etc-map-corner-tr" />
        <div className="etc-map-corner etc-map-corner-bl" />
        <div className="etc-map-corner etc-map-corner-br" />

        <MapContainer center={[22.5, 80]} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

          {triggers.map((t, i) => {
            const hex   = alertHex(t.alert_level)
            const lvlUp = String(t.alert_level || '').toUpperCase()
            const isHot = lvlUp === 'RED' || lvlUp === 'CRITICAL' || lvlUp === 'ORANGE'
            const r     = circleR(t.value)

            const popup = (
              <Popup>
                <div style={{
                  fontFamily: 'monospace', minWidth: 170,
                  background: '#090b1a', color: '#e0e0e0',
                  border: `1.5px solid ${hex}66`, borderRadius: 10, padding: '12px 14px',
                  boxShadow: `0 0 18px ${hex}33`,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: hex, marginBottom: 8 }}>{t.region}</div>
                  <div style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 750,
                    color: hex, background: `${hex}22`, padding: '2px 8px',
                    borderRadius: 999, border: `1px solid ${hex}44`, marginBottom: 8,
                  }}>{t.alert_level || 'OK'}</div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    Value: <strong style={{ color: '#fff' }}>{t.value}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
                    {Number(t.lat).toFixed(4)}° N, {Number(t.lng).toFixed(4)}° E
                  </div>
                </div>
              </Popup>
            )

            return (
              <React.Fragment key={i}>
                {/* Outer slow pulse ring (threat intensity glow) */}
                <CircleMarker center={[t.lat, t.lng]} radius={r + 22}
                  pathOptions={{ color: hex, fillColor: 'transparent', fillOpacity: 0, weight: 0.8,
                    className: isHot ? 'etc-ring-pulse' : undefined, opacity: isHot ? 0.5 : 0.15 }} />
                {/* Middle radar ring */}
                {isHot && (
                  <CircleMarker center={[t.lat, t.lng]} radius={r + 10}
                    pathOptions={{ color: hex, fillColor: 'transparent', fillOpacity: 0, weight: 1.2, opacity: 0.35 }} />
                )}
                {/* Core marker */}
                <CircleMarker center={[t.lat, t.lng]} radius={r}
                  pathOptions={{ color: hex, fillColor: hex, fillOpacity: isHot ? 0.48 : 0.28, weight: isHot ? 2.5 : 1.5 }}>
                  {popup}
                </CircleMarker>
              </React.Fragment>
            )
          })}
        </MapContainer>
      </div>
    </Motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Satellite Threat Tracker  (mission-control, orbit-grouped)
// ─────────────────────────────────────────────────────────────────────────────
// Tiny SVG satellite icon — no emoji, no external icon needed here
function SatSvg({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="4" height="4" rx="1" fill={color} opacity="0.9" />
      <rect x="0" y="6" width="4" height="2" rx="0.5" fill={color} opacity="0.6" />
      <rect x="10" y="6" width="4" height="2" rx="0.5" fill={color} opacity="0.6" />
      <line x1="7" y1="0" x2="7" y2="4"  stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="7" y1="10" x2="7" y2="14" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

function SatelliteTracker({ satellites, loading, error }) {
  const top5 = satellites.slice(0, 5)

  // Group by orbit type
  const groups = {}
  top5.forEach(sat => {
    const key = sat.orbit || 'UNK'
    if (!groups[key]) groups[key] = []
    groups[key].push(sat)
  })

  return (
    <Motion.div
      className="card glass neon-border"
      style={{ gridColumn: 'span 5', padding: 16 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionLabel icon={Satellite}>Satellite Threat Tracker</SectionLabel>
        <div className="etc-timestamp">
          <span className="etc-timestamp-dot" />
          Top {top5.length} by risk
        </div>
      </div>

      {loading && !satellites.length && <LoadingBar text="Loading satellite data..." />}
      {error   && !satellites.length && <ErrorBar text={error} />}
      {!loading && !error && satellites.length === 0 && (
        <div className="etc-empty">No satellite data available</div>
      )}

      <div className="etc-sat-list">
        <AnimatePresence>
          {Object.entries(groups).map(([orbit, sats]) => (
            <React.Fragment key={orbit}>
              {/* Orbit group header */}
              <div className="etc-orbit-group-label">
                <span>{orbit} Orbit</span>
                <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{sats.length} asset{sats.length !== 1 ? 's' : ''}</span>
              </div>

              {sats.map((sat, i) => {
                const hex   = scoreHex(sat.riskScore)
                const pct   = Math.min(100, Math.max(0, sat.riskScore))
                const riskLabel = sat.riskScore >= 70 ? 'HIGH' : sat.riskScore >= 50 ? 'MED' : 'LOW'

                return (
                  <Motion.div
                    key={sat.id ?? `${orbit}-${i}`}
                    className="etc-sat-card"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 24 }}
                    style={{ '--sat-accent': hex }}
                  >
                    <div className="etc-sat-card-top">
                      <div className="etc-sat-icon" style={{ borderColor: `${hex}33`, background: `${hex}10` }}>
                        <SatSvg color={hex} />
                      </div>
                      <div className="etc-sat-info">
                        <div className="etc-sat-name">{sat.name}</div>
                        <div className="etc-sat-orbit">{sat.orbit}</div>
                      </div>
                      <span className="etc-sat-risk-badge" style={{
                        color: hex,
                        background: `${hex}18`,
                        borderColor: `${hex}44`,
                      }}>
                        {riskLabel}
                      </span>
                    </div>

                    <div className="etc-sat-bar-wrap">
                      <div className="etc-sat-bar-track">
                        <div className="etc-sat-bar-fill" style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${hex}aa, ${hex})`,
                          boxShadow: pct >= 70 ? `0 0 6px ${hex}88` : 'none',
                        }} />
                      </div>
                      <span className="etc-sat-score" style={{ color: hex }}>{sat.riskScore}</span>
                    </div>

                    <div className="etc-sat-status-row">
                      <span className="etc-sat-status-dot" style={{
                        background: hex,
                        boxShadow: `0 0 4px ${hex}`,
                        animation: pct >= 70 ? 'etcPulse 1.8s ease-in-out infinite' : 'none',
                      }} />
                      <span className="etc-sat-status-text">{sat.status}</span>
                    </div>
                  </Motion.div>
                )
              })}
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>
    </Motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Aviation Corridor Status  (unchanged layout, refined styling)
// ─────────────────────────────────────────────────────────────────────────────
function AviationCorridors({ alerts, loading, error }) {
  return (
    <Motion.div
      className="card glass neon-border"
      style={{ gridColumn: 'span 6', padding: 16 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, type: 'spring', stiffness: 140, damping: 20 }}
    >
      <SectionLabel icon={Zap}>Aviation Corridor Status</SectionLabel>

      {loading && !alerts.length && <LoadingBar text="Loading aviation data..." />}
      {error   && !alerts.length && <ErrorBar text={error} />}
      {!loading && !error && alerts.length === 0 && (
        <div className="etc-empty">No active aviation alerts</div>
      )}

      <div className="etc-avi-grid">
        <AnimatePresence>
          {alerts.map((a, i) => {
            const hex = aviHex(a.status)
            return (
              <Motion.div
                key={a.route_id ?? i}
                className="etc-avi-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 200, damping: 22 }}
                style={{ borderColor: `${hex}30`, borderTop: `2px solid ${hex}` }}
              >
                <div className="etc-avi-route">{a.route_id ?? '--'}</div>
                <div className="etc-avi-status-row">
                  <span className="etc-avi-status-dot" style={{
                    background: hex, boxShadow: `0 0 6px ${hex}`,
                    animation: hex === '#ff3b3b' ? 'etcPulse 1.6s ease-in-out infinite' : 'none',
                  }} />
                  <span className="etc-avi-status-label" style={{ color: hex }}>{a.status ?? 'Unknown'}</span>
                </div>
                {a.action && <div className="etc-avi-action">{a.action}</div>}
              </Motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Space Weather Intelligence  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function SpaceWeatherIntel({ meta, loading, error }) {
  const cards = [
    { label: 'Flare Class',  value: meta?.flare_class  ?? '--', sub: 'X-ray burst classification', accent: '#ffbf1f' },
    { label: 'X-Ray Flux',   value: meta?.x_ray_flux  != null ? String(meta.x_ray_flux)  : '--', sub: 'W/m² (measured)', accent: 'var(--neonC)' },
    { label: 'Proton Flux',  value: meta?.proton_flux != null ? String(meta.proton_flux) : '--', sub: 'pfu at >10 MeV', accent: 'var(--neonB)' },
    {
      label: 'Global Alert', value: meta?.global_alert ?? '--', sub: 'NOAA alert status',
      accent: String(meta?.global_alert ?? '').toUpperCase().includes('HIGH') ||
              String(meta?.global_alert ?? '').toUpperCase().includes('WARNING')
        ? '#ff3b3b' : '#35f28c',
    },
  ]

  return (
    <Motion.div
      className="card glass neon-border"
      style={{ gridColumn: 'span 6', padding: 16 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 140, damping: 20 }}
    >
      <SectionLabel icon={Activity}>Space Weather Intelligence</SectionLabel>

      {loading && !meta && <LoadingBar text="Loading space weather data..." />}
      {error   && !meta && <ErrorBar text={error} />}
      {!loading && !error && !meta && <div className="etc-empty">No intelligence data available</div>}

      {(meta || (!loading && !error)) && (
        <div className="etc-intel-grid">
          {cards.map(c => (
            <Motion.div
              key={c.label}
              className="etc-intel-card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{ '--intel-accent': c.accent }}
            >
              <div className="etc-intel-label">{c.label}</div>
              <div className="etc-intel-value" style={{ color: c.accent }}>{c.value}</div>
              <div className="etc-intel-sub">{c.sub}</div>
            </Motion.div>
          ))}
        </div>
      )}
    </Motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — Live Activity Feed  (new panel, uses existing API data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds mission-log entries from API data already in scope.
 * No new API calls — everything is derived from threat / infra / helio.
 */
function buildFeedEntries({ threat, infra, helio, threatTs }) {
  const entries = []
  const now = fmtTime()

  // Threat / storm entries
  if (threat) {
    const kp = threat?.live_telemetry?.kp_index ?? threat?.kp_index
    const sc = threat?.storm_metadata?.storm_class ?? threat?.stormClass
    const rl = threat?.risk_level ?? 'LOW'
    const fc = threat?.flare_class

    entries.push({
      id: 'threat-risk',
      color: rl?.toUpperCase() === 'HIGH' ? '#ff3b3b' : rl?.toUpperCase() === 'MEDIUM' ? '#ffbf1f' : '#35f28c',
      text: `AI prediction: ${rl ?? 'UNKNOWN'} threat detected — ${fc ?? 'no flare'}`,
      time: threatTs || now,
      pulse: rl?.toUpperCase() === 'HIGH',
    })
    if (kp != null) entries.push({
      id: 'threat-kp',
      color: 'var(--neonC)',
      text: `Kp index reading: ${kp}${kp >= 7 ? ' — STORM THRESHOLD EXCEEDED' : kp >= 4 ? ' — elevated activity' : ' — nominal'}`,
      time: now,
    })
    if (sc && sc !== 'NOMINAL') entries.push({
      id: 'threat-storm',
      color: '#ffbf1f',
      text: `Storm classified: ${sc}`,
      time: now,
    })
  }

  // Grid entries
  if (infra?.grid_heatmap_triggers?.length) {
    const hotRegions = (infra.grid_heatmap_triggers || [])
      .filter(t => ['RED','CRITICAL','ORANGE'].includes(String(t.alert_level || '').toUpperCase()))
    if (hotRegions.length) {
      entries.push({
        id: 'grid-hot',
        color: '#ff3b3b',
        text: `Grid alert: ${hotRegions.length} critical region${hotRegions.length > 1 ? 's' : ''} — ${hotRegions.map(r => r.region).slice(0, 2).join(', ')}`,
        time: now,
        pulse: true,
      })
    }
    entries.push({
      id: 'grid-total',
      color: 'var(--neonB)',
      text: `Infrastructure scan: ${infra.grid_heatmap_triggers.length} grid region${infra.grid_heatmap_triggers.length !== 1 ? 's' : ''} monitored`,
      time: now,
    })
  }

  // Aviation
  if (infra?.aviation_alerts?.length) {
    const warned = (infra.aviation_alerts || []).filter(a => String(a.status || '').toUpperCase() !== 'NOMINAL')
    if (warned.length) entries.push({
      id: 'avi-warn',
      color: '#ffbf1f',
      text: `Aviation: ${warned.length} non-nominal corridor${warned.length > 1 ? 's' : ''} — ${warned.map(a => a.route_id).slice(0, 3).join(', ')}`,
      time: now,
    })
  }

  // Satellite
  if (helio?.curated_top_10?.length || helio?.satellites?.length) {
    const sats = helio.curated_top_10 ?? helio.satellites ?? []
    const high = sats.filter(s => (s.riskScore ?? s.risk_score ?? 0) >= 70)
    if (high.length) entries.push({
      id: 'sat-high',
      color: '#ff3b3b',
      text: `Satellite threat: ${high.length} asset${high.length > 1 ? 's' : ''} at HIGH risk — ${high.slice(0,2).map(s => s.name ?? s.satellite_name ?? 'UNK').join(', ')}`,
      time: now,
      pulse: true,
    })
  }

  // Helio meta
  if (helio?.metadata?.global_alert) {
    entries.push({
      id: 'helio-alert',
      color: 'var(--neonC)',
      text: `NOAA global alert: ${helio.metadata.global_alert}`,
      time: now,
    })
  }

  // System heartbeat (always shown)
  entries.push({
    id: 'sys-ok',
    color: '#35f28c',
    text: 'All telemetry streams nominal — next scan in 60s',
    time: now,
    isCursor: true,
  })

  return entries.slice(0, 12)
}

function LiveFeed({ threat, infra, helio, threatTs, loading }) {
  const entries = buildFeedEntries({ threat, infra, helio, threatTs })

  return (
    <Motion.div
      className="card glass neon-border"
      style={{ gridColumn: 'span 12', padding: '14px 0 0' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, type: 'spring', stiffness: 140, damping: 20 }}
    >
      {/* Terminal title bar */}
      <div className="etc-terminal-bar">
        <span className="etc-terminal-dot" style={{ background: '#ff5f57' }} />
        <span className="etc-terminal-dot" style={{ background: '#febc2e' }} />
        <span className="etc-terminal-dot" style={{ background: '#28c840' }} />
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '1px', marginLeft: 6 }}>
          LIVE ACTIVITY FEED — TELEMETRY STREAM
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {loading && <span className="etc-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
          <Wifi size={10} color="var(--neonC)" strokeWidth={2} />
          <span style={{ fontSize: 9, color: 'var(--neonC)', fontFamily: 'var(--mono)' }}>LIVE</span>
        </span>
      </div>

      <div className="etc-feed" style={{ padding: '4px 0 12px' }}>
        <AnimatePresence initial={false}>
          {entries.map((e, i) => (
            <Motion.div
              key={e.id}
              className="etc-feed-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 240, damping: 26 }}
            >
              <span
                className={`etc-feed-dot${e.pulse ? ' etc-feed-dot-pulse' : ''}`}
                style={{ background: e.color, boxShadow: `0 0 4px ${e.color}`, color: e.color }}
              />
              <div className="etc-feed-body">
                <div className={`etc-feed-text${e.pulse ? '' : ' etc-feed-text-muted'}`}>
                  <span style={{ color: 'var(--neonC)', marginRight: 5 }}>&gt;</span>
                  {e.text}
                  {e.isCursor && <span className="etc-feed-cursor" />}
                </div>
                <div className="etc-feed-time">{e.time}</div>
              </div>
            </Motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE — orchestrates all fetching  (same logic as before)
// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [threat, setThreat]               = useState(null)
  const [threatLoading, setThreatLoading] = useState(false)
  const [threatError, setThreatError]     = useState('')
  const [threatTs, setThreatTs]           = useState('')

  const [infra, setInfra]               = useState(null)
  const [infraLoading, setInfraLoading] = useState(false)
  const [infraError, setInfraError]     = useState('')

  const [helio, setHelio]               = useState(null)
  const [helioLoading, setHelioLoading] = useState(false)
  const [helioError, setHelioError]     = useState('')

  const fetchThreat = useCallback(async (signal) => {
    setThreatLoading(true); setThreatError('')
    try {
      const res = await axios.post(`${API_V3}/api/v1/ai/predict-live`, null, { signal })
      logApiResponse('POST /api/v1/ai/predict-live', res.data)
      setThreat(res.data); setThreatTs(fmtNow())
    } catch (e) {
      if (!axios.isCancel(e))
        setThreatError(e?.response?.data?.detail || e.message || 'Prediction request failed')
    } finally { setThreatLoading(false) }
  }, [])

  const fetchInfra = useCallback(async (signal) => {
    setInfraLoading(true); setInfraError('')
    try {
      const res = await axios.get(`${API_V2}/api/v1/infrastructure/impact`, { signal })
      logApiResponse('GET /api/v1/infrastructure/impact', res.data)
      setInfra(res.data)
    } catch (e) {
      if (!axios.isCancel(e))
        setInfraError(e?.response?.data?.detail || e.message || 'Infrastructure request failed')
    } finally { setInfraLoading(false) }
  }, [])

  const fetchHelio = useCallback(async (signal) => {
    setHelioLoading(true); setHelioError('')
    try {
      const res = await axios.get(`${API_V1}/api/helio-risk`, { signal })
      logApiResponse('GET /api/helio-risk', res.data)
      setHelio(res.data)
    } catch (e) {
      if (!axios.isCancel(e))
        setHelioError(e?.response?.data?.detail || e.message || 'Helio risk request failed')
    } finally { setHelioLoading(false) }
  }, [])

  const timerRef = useRef(null)
  useEffect(() => {
    const ctrl = new AbortController()
    fetchThreat(ctrl.signal)
    fetchInfra(ctrl.signal)
    fetchHelio(ctrl.signal)
    timerRef.current = setInterval(() => {
      const c = new AbortController()
      fetchThreat(c.signal); fetchInfra(c.signal); fetchHelio(c.signal)
    }, REFRESH_MS)
    return () => { ctrl.abort(); clearInterval(timerRef.current) }
  }, [fetchThreat, fetchInfra, fetchHelio])

  const triggers  = infra?.grid_heatmap_triggers ?? []
  const aviAlerts = infra?.aviation_alerts       ?? []
  const sevColor  = infra?.storm_metadata?.severity_color ?? null

  const rawSats   = helio?.curated_top_10 ?? helio?.top_10 ?? helio?.satellites ?? []
  const satellites = rawSats
    .map((r, i) => normalizeSatellite(r, i))
    .sort((a, b) => b.riskScore - a.riskScore)

  const helioMeta = helio?.metadata ?? null

  const handleRefreshAll = useCallback(() => {
    const ctrl = new AbortController()
    fetchThreat(ctrl.signal); fetchInfra(ctrl.signal); fetchHelio(ctrl.signal)
  }, [fetchThreat, fetchInfra, fetchHelio])

  const anyLoading = threatLoading || infraLoading || helioLoading

  return (
    <PageTransition>
      <style>{`
        @keyframes etcRingPulse { 0%,100%{stroke-opacity:.75} 50%{stroke-opacity:.1} }
        .etc-ring-pulse { animation: etcRingPulse 2.2s ease-in-out infinite; }
        @keyframes etcParticle {
          0%   { offset-distance:0%;   opacity:0; }
          8%   { opacity:0.9; }
          88%  { opacity:0.65; }
          100% { offset-distance:100%; opacity:0; }
        }
      `}</style>

      <div className="container" style={{ padding: '18px 0 40px' }}>
        <div className="split">
          <Sidebar />
          <main className="main">
            <Topbar
              title="Earth Threat Center"
              subtitle="Live space-weather operations — threat status, grid defence, satellite risk"
            />

            <section className="grid">
              <ThreatHero
                data={threat} infra={infra} loading={threatLoading}
                error={threatError} onRefresh={handleRefreshAll} ts={threatTs}
              />
              <GridDefenceMap
                triggers={triggers} loading={infraLoading}
                error={infraError} sevColor={sevColor}
              />
              <SatelliteTracker
                satellites={satellites} loading={helioLoading} error={helioError}
              />
              <AviationCorridors
                alerts={aviAlerts} loading={infraLoading} error={infraError}
              />
              <SpaceWeatherIntel
                meta={helioMeta} loading={helioLoading} error={helioError}
              />
              <LiveFeed
                threat={threat} infra={infra} helio={helio}
                threatTs={threatTs} loading={anyLoading}
              />
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
