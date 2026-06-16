import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Globe, Shield, FileText, Sun, FlaskConical,
  Clock, Zap, Plane, Activity, CheckCircle, RefreshCw
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import { useMagStormMode } from '../context/MagStormContext'
import MagStormLoader from '../components/MagStormLoader'

/* Tiny inline SVG helpers — no emoji, no extra deps */
function LiveDot({ active }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
      background: active ? '#35f28c' : 'rgba(255,255,255,0.25)',
      boxShadow: active ? '0 0 6px #35f28c' : 'none',
      animation: active ? 'mgPulse 2s ease-in-out infinite' : 'none',
    }} />
  )
}
function SimIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M4.5 1L8 8H1L4.5 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}


function pipelineColor(s) {
  if (!s) return 'var(--muted)'
  const v = String(s).toUpperCase()
  if (v === 'HEALTHY' || v === 'NOMINAL') return 'var(--risk-low)'
  if (v === 'DEGRADED' || v === 'WARNING') return 'var(--risk-med)'
  return 'var(--risk-high)'
}
function kpColor(kp) {
  if (kp == null) return 'var(--muted)'
  if (kp >= 7) return 'var(--risk-high)'
  if (kp >= 4) return 'var(--risk-med)'
  return 'var(--risk-low)'
}
function stormColorFn(cls) {
  if (!cls) return 'var(--muted)'
  const c = String(cls).toUpperCase()
  if (c === 'NOMINAL' || c === 'G1') return 'var(--risk-low)'
  if (c === 'G2' || c === 'G3' || c === 'M') return 'var(--risk-med)'
  return 'var(--risk-high)'
}
function aviationStatusColor(s) {
  if (!s) return 'var(--muted)'
  const v = String(s).toUpperCase()
  if (v === 'NOMINAL') return 'var(--risk-low)'
  if (v === 'WARNING') return 'var(--risk-med)'
  return 'var(--risk-high)'
}
function fmtTimestamp(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toUTCString().replace('GMT', 'UTC') }
  catch { return ts }
}
function fmtCountdown(sec) {
  if (sec == null || sec < 0) return '00:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/** Derive threat level from Kp index. Returns concrete hex colors (safe for CSS template literals). */
function getThreatLevel(kp) {
  if (kp == null) return { level: 'UNKNOWN', idx: -1, color: '#888888' }
  if (kp >= 8)   return { level: 'CRITICAL', idx: 4, color: '#ff1744' }
  if (kp >= 6)   return { level: 'SEVERE',   idx: 3, color: '#ff5722' }
  if (kp >= 4)   return { level: 'HIGH',     idx: 2, color: '#ffbf1f' }
  if (kp >= 2)   return { level: 'ELEVATED', idx: 1, color: '#ffd740' }
  return           { level: 'SAFE',     idx: 0, color: '#35f28c' }
}

/** DEFCON level: 1 = CATASTROPHIC, 5 = SAFE */
function calcDefcon(kp, stormClass, isSim) {
  const cls = String(stormClass || '').toUpperCase()
  let level = 5
  if      (kp >= 8 || cls === 'G5' || cls === 'X5') level = 1
  else if (kp >= 6 || cls === 'G4' || cls === 'G3') level = 2
  else if (kp >= 4 || cls === 'G2' || cls === 'M')  level = 3
  else if (kp >= 2 || cls === 'G1')                 level = 4
  if (isSim) level = Math.min(2, level)
  return level
}

const DEFCON_META = {
  5: { label: 'SAFE',         color: '#35f28c', desc: 'Normal space weather conditions' },
  4: { label: 'ELEVATED',     color: '#ffd740', desc: 'Minor geomagnetic disturbance' },
  3: { label: 'MODERATE',     color: '#ffbf1f', desc: 'Significant storm activity' },
  2: { label: 'SEVERE',       color: '#ff5722', desc: 'Major infrastructure impact' },
  1: { label: 'CATASTROPHIC', color: '#ff1744', desc: 'Extreme event — all systems alert' },
}

const THREAT_META = [
  { label: 'SAFE',     color: '#35f28c' },
  { label: 'ELEVATED', color: '#ffd740' },
  { label: 'HIGH',     color: '#ffbf1f' },
  { label: 'SEVERE',   color: '#ff5722' },
  { label: 'CRITICAL', color: '#ff1744' },
]

/* ══════════════════════════════════════════════
   BASE SUB-COMPONENTS (preserved from original)
══════════════════════════════════════════════ */
function PulseDot({ color }) {
  return (
    <span style={{
      width: 9, height: 9, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: `0 0 7px ${color}`,
      animation: 'mgPulse 2s ease-in-out infinite',
      display: 'inline-block',
    }} />
  )
}

function StatCard({ label, value, accent, delay = 0, large = false }) {
  return (
    <Motion.div
      className="glass neon-border"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}  
      transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.6, delay }}
      style={{
        padding: '22px 24px', borderRadius: 'var(--radius-md)',
        display: 'flex', flexDirection: 'column', gap: 10,
        borderTop: `2px solid ${accent || 'transparent'}`,
      }}
    >
      <span style={{ fontSize: 11, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
      </span>
      <span style={{
        fontSize: large ? 30 : 22, fontWeight: 750,
        fontFamily: 'var(--mono)', color: accent || 'var(--text)',
        lineHeight: 1.1, wordBreak: 'break-word',
      }}>
        {value ?? '—'}
      </span>
    </Motion.div>
  )
}

function CountdownCard({ label, etaSeconds, accent, delay = 0 }) {
  const [remaining, setRemaining] = useState(etaSeconds ?? 0)
  useEffect(() => { setRemaining(etaSeconds ?? 0) }, [etaSeconds])
  useEffect(() => {
    if (remaining <= 0) return
    const t = setInterval(() => setRemaining(p => Math.max(0, p - 1)), 1000)
    return () => clearInterval(t)
  }, [remaining])

  return (
    <Motion.div
      className="glass neon-border"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.6, delay }}
      style={{
        padding: '22px 24px', borderRadius: 'var(--radius-md)',
        display: 'flex', flexDirection: 'column', gap: 10,
        borderTop: `2px solid ${accent || 'transparent'}`,
      }}
    >
      <span style={{ fontSize: 11, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: 30, fontWeight: 750, fontFamily: 'var(--mono)', color: accent || 'var(--text)', lineHeight: 1.1 }}>
        {fmtCountdown(remaining)}
      </span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>live countdown</span>
    </Motion.div>
  )
}

function ModeToggle({ mode, onChange }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.15)',
      overflow: 'hidden', background: 'rgba(0,0,0,0.25)',
    }}>
      {['live', 'simulation'].map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: '7px 16px', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 650, letterSpacing: '0.5px',
          textTransform: 'uppercase', fontFamily: 'var(--mono)',
          transition: 'background 200ms, color 200ms',
          background: mode === m
            ? m === 'live' ? 'rgba(53,242,140,0.22)' : 'rgba(255,59,59,0.22)'
            : 'transparent',
          color: mode === m
            ? m === 'live' ? 'var(--risk-low)' : 'var(--risk-high)'
            : 'var(--muted)',
        }}>
          {m === 'live'
            ? <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><LiveDot active={mode === 'live'} /> LIVE</span>
            : <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}><SimIcon /> SIM</span>
          }
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 1 — EMERGENCY THREAT BANNER
══════════════════════════════════════════════ */
function EmergencyBanner({ stormClass, sevColor, etaSeconds, mode }) {
  const isSim = mode === 'simulation'
  const bannerColor = sevColor || (isSim ? '#ff1744' : '#35f28c')
  const isSevere = isSim || (sevColor && sevColor !== '#35f28c' && sevColor !== 'green')
  const threatLabel = isSim
    ? 'CRITICAL EMERGENCY'
    : (!stormClass || stormClass === 'NOMINAL' ? 'MONITORING' : 'ACTIVE STORM')
  const impactStatus = etaSeconds > 0
    ? `IMPACT IN ${fmtCountdown(etaSeconds)}`
    : etaSeconds === 0 ? 'IMPACT NOW'
    : 'NO IMMEDIATE IMPACT'

  return (
    <Motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 16 }}
      style={{
        marginBottom: 18, borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${bannerColor}${isSevere ? 'cc' : '55'}`,
        background: `linear-gradient(135deg, ${bannerColor}18 0%, ${bannerColor}08 50%, rgba(0,0,0,0.25) 100%)`,
        boxShadow: isSevere
          ? `0 0 48px ${bannerColor}44, 0 0 100px ${bannerColor}22, inset 0 0 40px ${bannerColor}11`
          : `0 0 24px ${bannerColor}22`,
        padding: '20px 26px',
        animation: isSevere ? 'bannerGlow 2.5s ease-in-out infinite' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
        {/* Pulse icon */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `${bannerColor}22`, border: `2px solid ${bannerColor}88`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 20px ${bannerColor}44`,
          animation: isSevere ? 'mgPulse 1.4s ease-in-out infinite' : 'none',
        }}>
          <AlertTriangle size={20} color={bannerColor} strokeWidth={2} />
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 10, letterSpacing: '2.5px', color: bannerColor, fontFamily: 'var(--mono)', marginBottom: 4, opacity: 0.8 }}>
            SOLAR SENTINEL COMMAND · {mode.toUpperCase()} MODE
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color={bannerColor} strokeWidth={2} />
            SOLAR STORM STATUS
          </div>
        </div>

        {/* Stat columns */}
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Storm Class',  value: stormClass || '—' },
            { label: 'Threat Level', value: threatLabel },
            { label: 'Impact Status',value: impactStatus },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              textAlign: 'center', padding: '0 20px',
              borderLeft: i > 0 ? `1px solid ${bannerColor}33` : 'none',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: i === 0 ? 24 : 14, fontWeight: 750, color: bannerColor, fontFamily: 'var(--mono)', letterSpacing: '0.5px' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Live / Sim badge */}
        <div style={{
          padding: '6px 16px', borderRadius: 999,
          background: `${bannerColor}22`, border: `1px solid ${bannerColor}66`,
          fontSize: 11, fontWeight: 750, fontFamily: 'var(--mono)',
          color: bannerColor, letterSpacing: '1.5px',
          animation: isSevere ? 'mgBlink 2s ease infinite' : 'none',
          flexShrink: 0,
        }}>
          {mode.toUpperCase()}
        </div>
      </div>
    </Motion.div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 2 — GLOBAL THREAT LEVEL METER
══════════════════════════════════════════════ */
function ThreatMeter({ kpIndex }) {
  const { idx: activeIdx, color: activeColor } = getThreatLevel(kpIndex)

  return (
    <div className="card glass neon-border" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Globe size={12} color="currentColor" />
        Global Threat Level
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {THREAT_META.map((t, i) => {
          const isActive = i === activeIdx
          const isPast   = i < activeIdx
          return (
            <Motion.div
              key={t.label}
              animate={{ opacity: isActive ? 1 : isPast ? 0.75 : 0.52, scale: isActive ? 1.02 : 1 }}
              transition={{ duration: 0.4 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: isActive ? `${t.color}18` : 'transparent',
                border: isActive ? `1px solid ${t.color}66` : '1px solid transparent',
                boxShadow: isActive ? `0 0 18px ${t.color}33` : 'none',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: isActive || isPast ? t.color : 'rgba(255,255,255,0.15)',
                boxShadow: isActive ? `0 0 10px ${t.color}` : 'none',
                animation: isActive ? 'mgPulse 1.4s ease-in-out infinite' : 'none',
              }} />
              {/* progress bar */}
              <div style={{
                flex: 1, height: 4, borderRadius: 2,
                background: `${t.color}${isActive ? 'cc' : isPast ? '55' : '18'}`,
                position: 'relative', overflow: 'hidden',
              }}>
                {isActive && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(90deg, transparent, ${t.color}88, transparent)`,
                    animation: 'scanSlide 2s linear infinite',
                  }} />
                )}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 750, fontFamily: 'var(--mono)',
                letterSpacing: '1.5px', minWidth: 64, textAlign: 'right',
                color: isActive ? t.color : isPast ? `${t.color}cc` : 'rgba(255,255,255,0.55)',
              }}>
                {t.label}
              </div>
            </Motion.div>
          )
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', display: 'flex', gap: 6 }}>
        <span>Kp Index:</span>
        <span style={{ color: activeColor, fontWeight: 650 }}>{kpIndex ?? '—'}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 3 — SPACE WEATHER DEFCON
══════════════════════════════════════════════ */
function DefconCard({ kpIndex, stormClass, mode }) {
  const defconLevel = calcDefcon(kpIndex ?? 0, stormClass, mode === 'simulation')
  const activeMeta  = DEFCON_META[defconLevel]

  return (
    <div className="card glass neon-border" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={12} color="currentColor" />
        Space Weather DEFCON
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(lvl => {
          const meta     = DEFCON_META[lvl]
          const isActive = lvl === defconLevel
          return (
            <Motion.div
              key={lvl}
              animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1.02 : 1 }}
              transition={{ duration: 0.35 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 8,
                background: isActive ? `${meta.color}18` : 'transparent',
                border: isActive ? `1px solid ${meta.color}77` : '1px solid transparent',
                boxShadow: isActive ? `0 0 20px ${meta.color}33` : 'none',
              }}
            >
              {/* Level box */}
              <div style={{
                width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                background: isActive ? meta.color : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontWeight: 750, fontSize: 14,
                color: isActive ? '#000' : 'rgba(255,255,255,0.55)',
                boxShadow: isActive ? `0 0 14px ${meta.color}88` : 'none',
                animation: isActive && lvl <= 2 ? 'mgPulse 1.4s ease-in-out infinite' : 'none',
              }}>
                {lvl}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 750, fontFamily: 'var(--mono)', letterSpacing: '0.8px', color: isActive ? meta.color : 'rgba(255,255,255,0.65)' }}>
                  {meta.label}
                </div>
                {isActive && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {meta.desc}
                  </div>
                )}
              </div>
              {isActive && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: meta.color, boxShadow: `0 0 10px ${meta.color}`,
                  animation: 'mgPulse 1.2s ease-in-out infinite',
                }} />
              )}
            </Motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 4 — MISSION BRIEF PANEL
══════════════════════════════════════════════ */
function MissionBrief({ data, mode }) {
  if (!data) return null
  const windSpeed = data.live_telemetry?.speed
  const kp        = data.live_telemetry?.kp_index
  const sc        = data.storm_metadata?.storm_class
  const eta       = data.storm_metadata?.eta_seconds
  const gridCnt   = (data.grid_heatmap_triggers  || []).length
  const aviCnt    = (data.aviation_alerts        || []).length
  const actCnt    = (data.automated_actions      || []).length
  const { level } = getThreatLevel(kp)
  const ts        = data.timestamp ? new Date(data.timestamp).toUTCString().replace('GMT', 'UTC') : 'UNKNOWN'

  const lines = [
    `> MISSION BRIEF — ${ts}`,
    `> MODE: ${mode.toUpperCase()} OPERATIONS`,
    ``,
    `STORM CLASSIFICATION:   ${sc || 'NOMINAL'}`,
    `GEOMAGNETIC KP INDEX:   ${kp ?? '—'}  (THREAT: ${level})`,
    `SOLAR WIND VELOCITY:    ${windSpeed != null ? (String(windSpeed).includes('km') ? windSpeed : `${windSpeed} km/s`) : '—'}`,
    `ESTIMATED IMPACT ETA:   ${eta != null ? fmtCountdown(eta) : 'N/A'}`,
    ``,
    `INFRASTRUCTURE STATUS:`,
    `  ├─ GRID REGIONS MONITORED:    ${gridCnt}`,
    `  ├─ AVIATION ALERTS ACTIVE:    ${aviCnt}`,
    `  └─ AUTOMATED ACTIONS QUEUED:  ${actCnt}`,
    ``,
    mode === 'simulation'
      ? `[!] SIMULATION ACTIVE — EMERGENCY PROTOCOLS ENGAGED`
      : `[OK] STATUS: MONITORING NOMINAL — ALL SYSTEMS REPORTING`,
  ]

  return (
    <div className="card glass neon-border" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FileText size={12} color="currentColor" />
        Mission Brief
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.55)', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 12,
        lineHeight: 1.75, position: 'relative', overflow: 'hidden',
      }}>
        {/* scanline */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
        }} />
        {lines.map((line, i) => (
          <Motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.025 }}
            style={{
              whiteSpace: 'pre',
              color: line.startsWith('>')      ? '#22d3ee'
                   : line.startsWith('[!]')   ? '#ffbf1f'
                   : line.startsWith('[OK]')  ? '#35f28c'
                   : line.startsWith('STORM') || line.startsWith('GEO') || line.startsWith('SOLAR') || line.startsWith('ESTIM') ? 'rgba(255,255,255,0.9)'
                   : line.startsWith('INFRA') ? '#22d3ee'
                   : 'rgba(255,255,255,0.6)',
            }}
          >
            {line || '\u00A0'}
          </Motion.div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 5 — SOLAR STORM TIMELINE
══════════════════════════════════════════════ */
function StormTimeline({ data }) {
  if (!data) return null
  const kp       = data.live_telemetry?.kp_index
  const sc       = data.storm_metadata?.storm_class
  const eta      = data.storm_metadata?.eta_seconds
  const gridCnt  = (data.grid_heatmap_triggers || []).length
  const aviCnt   = (data.aviation_alerts       || []).length
  const actCnt   = (data.automated_actions     || []).length

  const stages = [
    { id:'detect',   Icon: Sun,         label:'Solar Activity Detected',   active: kp != null && kp > 0,       detail: kp != null ? `Kp ${kp}` : 'Monitoring' },
    { id:'classify', Icon: FlaskConical, label:'Storm Classified',          active: !!sc && sc !== 'NOMINAL',   detail: sc || 'No storm' },
    { id:'impact',   Icon: Clock,        label:'Earth Impact Countdown',    active: eta != null && eta > 0,     detail: eta != null ? fmtCountdown(eta) : 'No ETA' },
    { id:'grid',     Icon: Zap,          label:'Grid Monitoring',           active: gridCnt > 0,                detail: `${gridCnt} regions` },
    { id:'aviation', Icon: Plane,        label:'Aviation Monitoring',       active: aviCnt  > 0,                detail: `${aviCnt} alerts` },
    { id:'mitigate', Icon: Shield,       label:'Mitigation Actions Active', active: actCnt  > 0,                detail: `${actCnt} actions` },
  ]

  let currentIdx = -1
  stages.forEach((s, i) => { if (s.active) currentIdx = i })

  return (
    <div className="card glass neon-border" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Activity size={12} color="currentColor" />
        Storm Operations Timeline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* vertical rail */}
        <div style={{ position: 'absolute', left: 14, top: 16, bottom: 16, width: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }} />

        {stages.map((stage, i) => {
          const isCurrent = i === currentIdx
          const isDone    = i < currentIdx
          const nodeColor = isCurrent ? '#22d3ee' : isDone ? '#35f28c' : 'rgba(255,255,255,0.12)'

          return (
            <Motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 160, damping: 20 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                paddingBottom: i < stages.length - 1 ? 16 : 0, position: 'relative',
              }}
            >
              {/* Node circle */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: isCurrent ? '#22d3ee' : isDone ? '#35f28c22' : 'rgba(255,255,255,0.06)',
                border: `2px solid ${nodeColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, position: 'relative', zIndex: 1,
                boxShadow: isCurrent ? '0 0 18px rgba(34,211,238,0.65)' : isDone ? '0 0 8px rgba(53,242,140,0.4)' : 'none',
                animation: isCurrent ? 'mgPulse 2s ease-in-out infinite' : 'none',
                color: isCurrent ? '#000' : isDone ? '#35f28c' : 'rgba(255,255,255,0.4)',
              }}>
                {isDone
                  ? <CheckCircle size={14} color="#35f28c" strokeWidth={2.5} />
                  : <stage.Icon size={14} color={isCurrent ? '#000' : 'rgba(255,255,255,0.4)'} strokeWidth={2} />
                }
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text)' : 'var(--muted)' }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: nodeColor, marginTop: 2 }}>
                  {stage.active ? stage.detail : '— Pending'}
                </div>
              </div>

              {isCurrent && (
                <div style={{
                  padding: '2px 8px', borderRadius: 999, marginTop: 5,
                  background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.4)',
                  fontSize: 9, fontWeight: 750, fontFamily: 'var(--mono)',
                  color: '#22d3ee', letterSpacing: '1px',
                  animation: 'mgBlink 2s ease infinite', flexShrink: 0,
                }}>
                  ACTIVE
                </div>
              )}
            </Motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 8 — ENHANCED AUTOMATED ACTION TERMINAL
══════════════════════════════════════════════ */
function ActionTerminal({ actions }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [actions])

  function getSev(text) {
    const t = String(text).toLowerCase()
    if (/critical|emergency|catastrophic/.test(t)) return { label: 'CRIT', color: '#ff8080', dotColor: '#ff4040' }
    if (/warn|alert|elevated|severe/.test(t))       return { label: 'WARN', color: '#ffd080', dotColor: '#ffbf1f' }
    return                                                  { label: 'OK',   color: 'rgba(255,255,255,0.75)', dotColor: '#35f28c' }
  }

  const nowStr = new Date().toISOString().substring(11, 19) + ' UTC'

  return (
    <div>
      {/* Terminal title bar */}
      <div style={{
        background: 'rgba(0,0,0,0.65)', borderRadius: '8px 8px 0 0',
        border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.5px' }}>
          — OPERATIONS FEED — AUTOMATED ACTIONS
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--mono)' }}>
          {nowStr}
        </span>
      </div>

      {/* Terminal body */}
      <div style={{
        background: 'rgba(0,0,0,0.6)', borderRadius: '0 0 8px 8px',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'var(--mono)', fontSize: 12,
        maxHeight: 230, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 5,
        position: 'relative',
      }}>
        {/* scanline */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
        }} />
        {(!actions || actions.length === 0)
          ? <span style={{ color: 'var(--muted)' }}>— No automated actions —</span>
          : actions.map((a, i) => {
            const text = String(a)
            const sev  = getSev(text)
            return (
              <Motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '2px 0' }}
              >
                <span style={{
                  flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
                  background: sev.dotColor, marginTop: 3, display: 'inline-block',
                  boxShadow: `0 0 5px ${sev.dotColor}88`,
                }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontSize: 10, paddingTop: 1 }}>
                  [{String(i + 1).padStart(3, '0')}]
                </span>
                <span style={{ flex: 1, color: sev.color }}>{text}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  {sev.label}
                </span>
              </Motion.div>
            )
          })
        }
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   FEATURE 7 — ENHANCED AVIATION TABLE
══════════════════════════════════════════════ */
function StatusBadge({ status }) {
  const color = aviationStatusColor(status)
  const hexMap = { 'var(--risk-high)': '#ff3b3b', 'var(--risk-med)': '#ffbf1f', 'var(--risk-low)': '#35f28c', 'var(--muted)': '#888' }
  const hex = hexMap[color] || '#888'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: `${hex}18`, border: `1px solid ${hex}55`,
      fontSize: 10, fontWeight: 750, fontFamily: 'var(--mono)',
      color: hex, letterSpacing: '0.5px',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: hex,
        animation: hex === '#ff3b3b' ? 'mgPulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {String(status || '—').toUpperCase()}
    </span>
  )
}

function AviationTable({ alerts }) {
  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState('route_id')
  const [sortDir, setSortDir] = useState('asc')
  const [filter,  setFilter]  = useState('ALL')

  const statuses = ['ALL', 'NOMINAL', 'WARNING', 'RE-ROUTED']

  const rows = (alerts || [])
    .filter(r => filter === 'ALL' || String(r.status).toUpperCase() === filter)
    .filter(r => {
      const q = search.toLowerCase()
      return !q || String(r.route_id).toLowerCase().includes(q) || String(r.action).toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = String(a[sortKey] ?? '')
      const bv = String(b[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const onSort = key => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filterBadgeColor = s => {
    if (s === 'WARNING' || s === 'RE-ROUTED') return '#ff3b3b'
    if (s === 'NOMINAL') return '#35f28c'
    return 'rgba(255,255,255,0.5)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search route or action…"
          style={{
            flex: 1, minWidth: 160,
            background: 'rgba(0,0,0,0.4)', color: 'var(--text)',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
            padding: '7px 12px', outline: 'none', fontSize: 12,
            fontFamily: 'var(--mono)',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {statuses.map(s => {
            const c = filterBadgeColor(s)
            const active = filter === s
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                fontSize: 10, fontWeight: 750, letterSpacing: '0.5px',
                border: active ? `1px solid ${c}66` : '1px solid rgba(255,255,255,0.1)',
                background: active ? `${c}18` : 'transparent',
                color: active ? c : 'var(--muted)',
                fontFamily: 'var(--mono)',
              }}>{s}</button>
            )
          })}
        </div>
      </div>

      {rows.length === 0
        ? <span className="subtle" style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>— No aviation alerts —</span>
        : (
          <table className="table">
            <thead>
              <tr>
                {[['route_id','Route ID'],['status','Status'],['action','Action / Order']].map(([k, l]) => (
                  <th key={k} onClick={() => onSort(k)} style={{
                    textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 600,
                    padding: '4px 10px', cursor: 'pointer', userSelect: 'none',
                    letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--mono)',
                  }}>
                    {l}{sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isDanger = String(r.status).toUpperCase() !== 'NOMINAL'
                const rowHex   = isDanger ? '#ff3b3b' : '#35f28c'
                return (
                  <Motion.tr key={i} className="rowHover"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <td style={{ borderLeft: `3px solid ${isDanger ? rowHex : 'transparent'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isDanger && <span style={{ width: 7, height: 7, borderRadius: '50%', background: rowHex, display: 'inline-block', boxShadow: `0 0 6px ${rowHex}`, animation: 'mgPulse 2s ease-in-out infinite', flexShrink: 0 }} />}
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 650, fontSize: 13 }}>{r.route_id}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="subtle" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{r.action}</td>
                  </Motion.tr>
                )
              })}
            </tbody>
          </table>
        )
      }
    </div>
  )
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
const POLL_MS = 30_000

export default function MagStormDashboardPage() {
  const { mode, setMode } = useMagStormMode()
  const [data,            setData]            = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')
  /* Minimum 2500ms boot sequence — loader shows until BOTH api+timer complete */
  const [startupComplete, setStartupComplete] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStartupComplete(true), 3500)
    return () => clearTimeout(t)
  }, [])

  const fetchData = useCallback(async (currentMode, signal) => {
    setLoading(true)
    setError('')
    try {
      console.log("api hit")
      const res = await axios.get(`/api/v1/infrastructure/impact?mode=${currentMode}`, { signal })
      console.log("FULL RESPONSE:", res.data)
      console.log("AVIATION ALERTS:", res.data.aviation_alerts)
      setData(res.data)
    } catch (err) {
      if (!axios.isCancel(err)) setError(err.message || 'Failed to fetch data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(mode, controller.signal)
    const interval = setInterval(() => fetchData(mode, controller.signal), POLL_MS)
    return () => { controller.abort(); clearInterval(interval) }
  }, [mode, fetchData])

  /* ── field mapping (unchanged) ── */
  const pipelineStatus = data?.pipeline_status ?? null
  const simActive      = data?.simulation_active != null ? (data.simulation_active ? 'Active' : 'Inactive') : null
  const windSpeed      = data?.live_telemetry?.speed ?? null
  const kpIndex        = data?.live_telemetry?.kp_index ?? null
  const stormClass     = data?.storm_metadata?.storm_class ?? null
  const etaSeconds     = data?.storm_metadata?.eta_seconds ?? null
  const sevColor       = data?.storm_metadata?.severity_color || null
  const timestamp      = data?.timestamp ?? null
  const autoActions    = data?.automated_actions ?? []
  const aviationAlerts = data?.aviation_alerts ?? []
  const gridTriggers   = data?.grid_heatmap_triggers ?? []

  /* derive theme accent from severity_color */
  const accent     = sevColor || (mode === 'simulation' ? 'var(--risk-high)' : 'var(--neonC)')
  const glowStyle  = sevColor ? { boxShadow: `0 0 32px ${sevColor}44, 0 0 8px ${sevColor}22` } : {}

  /* derived threat / DEFCON values */
  const { level: threatLevel, color: threatColor } = getThreatLevel(kpIndex)
  const defconLevel = calcDefcon(kpIndex ?? 0, stormClass, mode === 'simulation')
  const defconMeta  = DEFCON_META[defconLevel]

  /* banner color guaranteed hex */
  const bannerHex   = sevColor || (mode === 'simulation' ? '#ff1744' : '#35f28c')

  return (
    <PageTransition>
      {/* ── PREMIUM LOADER: shows until API loaded AND 2500ms startup complete ── */}
      <MagStormLoader visible={!startupComplete || !data} mode={mode} />
      <style>{`
        @keyframes mgPulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes mgSpin     { to{transform:rotate(360deg)} }
        @keyframes mgBlink    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes scanSlide  { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
        @keyframes bannerGlow {
          0%,100% { box-shadow: 0 0 36px ${bannerHex}44, 0 0 72px ${bannerHex}22, inset 0 0 28px ${bannerHex}11; }
          50%     { box-shadow: 0 0 72px ${bannerHex}66, 0 0 140px ${bannerHex}33, inset 0 0 56px ${bannerHex}22; }
        }
      `}</style>

      <div className="container" style={{ padding: '18px 0 40px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">

            {/* ── HEADER ── */}
            <header className="topbar glass neon-border" style={{ marginBottom: 18, ...glowStyle }}>
              <div className="topbarTitle">
                <h1>MagStorm Shield</h1>
                <p>
                  Infrastructure impact ·&nbsp;
                  <span style={{ color: accent, fontWeight: 650, textTransform: 'uppercase', fontFamily: 'var(--mono)', fontSize: 11 }}>
                    {mode}
                  </span>
                  {loading && <span style={{ marginLeft: 8, color: 'var(--muted)', animation: 'mgBlink 1.2s ease infinite', fontFamily: 'var(--mono)', fontSize: 11 }}>↻ refreshing…</span>}
                </p>
              </div>
              <div className="topbarRight">
                <ModeToggle mode={mode} onChange={m => { setMode(m); setData(null) }} />
                {pipelineStatus && (
                  <div className="pill">
                    <PulseDot color={pipelineColor(pipelineStatus)} />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>Pipeline</span>
                    <span style={{ fontWeight: 650 }}>{pipelineStatus}</span>
                  </div>
                )}
                {/* DEFCON header pill */}
                {data && (
                  <div className="pill" style={{ border: `1px solid ${defconMeta.color}66` }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>DEFCON</span>
                    <span style={{ fontWeight: 750, fontFamily: 'var(--mono)', fontSize: 15, color: defconMeta.color }}>
                      {defconLevel}
                    </span>
                    <span style={{ fontSize: 10, color: defconMeta.color, fontFamily: 'var(--mono)', letterSpacing: '0.5px' }}>
                      {defconMeta.label}
                    </span>
                  </div>
                )}
              </div>
            </header>

            {/* ── LOADING handled by full-screen MagStormLoader overlay above ── */}

            {/* ── ERROR ── */}
            {!loading && error && (
              <div className="glass" style={{ padding: 20, borderRadius: 'var(--radius-md)', borderLeft: `3px solid var(--risk-high)`, marginBottom: 18 }}>
                <span style={{ color: 'var(--risk-high)', fontSize: 14 }}>{error}</span>
              </div>
            )}

            {data && (
              <>
                {/* ══ FEATURE 1: EMERGENCY THREAT BANNER ══ */}
                <EmergencyBanner
                  stormClass={stormClass}
                  sevColor={sevColor}
                  etaSeconds={etaSeconds}
                  mode={mode}
                />

                {/* ══ FEATURES 2 + 3: THREAT METER + DEFCON ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <ThreatMeter kpIndex={kpIndex} />
                  <DefconCard  kpIndex={kpIndex} stormClass={stormClass} mode={mode} />
                </div>

                {/* ══ EXISTING KPI CARDS ══ */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <StatCard label="Pipeline Status"  value={pipelineStatus} accent={pipelineColor(pipelineStatus)} delay={0} />
                  <StatCard label="Simulation State" value={simActive}       accent="var(--neonC)"                  delay={0.04} />
                  <StatCard label="Solar Wind Speed" value={windSpeed}       accent="var(--neonB)"                  delay={0.08} />
                  <StatCard label="Kp Index"         value={kpIndex}         accent={kpColor(kpIndex)}              delay={0.12} />
                  <StatCard label="Storm Class"      value={stormClass}      accent={stormColorFn(stormClass)}      delay={0.16} />
                  <CountdownCard label="Impact ETA"  etaSeconds={etaSeconds} accent={accent}                        delay={0.20} />
                </section>

                {/* ══ FEATURES 4 + 5: MISSION BRIEF + STORM TIMELINE ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <MissionBrief data={data} mode={mode} />
                  <StormTimeline data={data} />
                </div>

                {/* ══ LAST UPDATED + FEATURE 10: ENHANCED COMMAND OVERVIEW ══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20 }}>

                  {/* Last Updated */}
                  <div className="card glass neon-border" style={{ ...glowStyle }}>
                    <h3 style={{ marginBottom: 14 }}>Last Updated</h3>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: accent, wordBreak: 'break-word' }}>
                      {fmtTimestamp(timestamp)}
                    </div>
                    <div className="subtle" style={{ fontSize: 12, marginTop: 8 }}>Auto-refresh every 30 seconds</div>
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#35f28c', animation: 'mgPulse 2s ease-in-out infinite' }} />
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '1px' }}>LIVE TELEMETRY FEED</span>
                    </div>
                  </div>

                  {/* FEATURE 10 — Command Overview Enhanced */}
                  <div className="card glass neon-border" style={{ ...glowStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h3 style={{ margin: 0 }}>Infrastructure Command Overview</h3>
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '1px',
                        color: defconMeta.color, padding: '3px 10px', borderRadius: 999,
                        border: `1px solid ${defconMeta.color}44`, background: `${defconMeta.color}11`,
                      }}>
                        {mode.toUpperCase()} OPS
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                      {[
                        { label: 'Storm Class',     val: stormClass,            Icon: Sun,      color: '#ffbf1f' },
                        { label: 'Threat Level',    val: threatLevel,           Icon: Zap,      color: threatColor },
                        { label: 'Grid Regions',    val: gridTriggers.length,   Icon: Activity, color: '#3b82f6' },
                        { label: 'Aviation Alerts', val: aviationAlerts.length, Icon: Plane,    color: '#22d3ee' },
                        { label: 'Actions Queued',  val: autoActions.length,    Icon: Shield,   color: '#ffbf1f' },
                      ].map(({ label, val, Icon, color }) => (
                        <Motion.div
                          key={label}
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                          style={{
                            background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                            padding: '12px 12px', border: `1px solid ${color}33`,
                            display: 'flex', flexDirection: 'column', gap: 4,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon size={16} color={color} strokeWidth={1.75} />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
                          <div style={{ fontSize: 20, fontWeight: 750, fontFamily: 'var(--mono)', color }}>{val ?? '—'}</div>
                        </Motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ══ FEATURE 8: AUTOMATED ACTION TERMINAL ══ */}
                <div className="card glass neon-border" style={{ marginBottom: 20, ...glowStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>Automated Action Center</h3>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#35f28c', letterSpacing: '1px' }}>
                      {autoActions.length} ENTRIES
                    </span>
                  </div>
                  <ActionTerminal actions={autoActions} />
                </div>

                {/* ══ FEATURE 7: AVIATION RISK TABLE ══ */}
                <div className="card glass neon-border" style={{ marginBottom: 20, ...glowStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ margin: 0 }}>Aviation Risk Table</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {aviationAlerts.some(a => String(a.status).toUpperCase() !== 'NOMINAL') && (
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '1px',
                          color: '#ff3b3b', padding: '3px 8px', borderRadius: 999,
                          border: '1px solid rgba(255,59,59,0.4)', background: 'rgba(255,59,59,0.1)',
                          animation: 'mgPulse 2s ease-in-out infinite',
                        }}>
                          ALERTS ACTIVE
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        {aviationAlerts.length} ROUTES
                      </span>
                    </div>
                  </div>
                  <AviationTable alerts={aviationAlerts} />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
