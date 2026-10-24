import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sun,
  AlertTriangle,
  CheckCircle,
  Plane,
  Zap,
  Globe,
  Radio,
  Layers,
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Activity,
  Crosshair,
  Satellite,
  Database,
  MapPin,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import AIPredictionPanel from '../components/AIPredictionPanel'
import GlobeRiskScene from '../components/GlobeRiskScene'
import SolarDiskViewer from '../components/SolarDiskViewer'
import { useSolarPrediction } from '../context/SolarPredictionContext'
import { useTelemetry } from '../context/TelemetryContext'
import { fetchHelioRiskSatellites } from '../utils/helioApi'
import '../styles/dashboard.css'

// ── Satellite Risk Mini Distribution Chart ───────────────────────────────────
function SatRiskMiniChart({ satellites, selectedSat, onSelect }) {
  if (!satellites || !satellites.length) return null
  const top8 = satellites.slice(0, 8)
  const max = 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {top8.map((s, i) => {
        const score = Number(s.risk_score ?? s.riskScore) || 0
        const pct = Math.min(100, Math.max(0, score))
        const hex = score >= 70 ? '#ff3b3b' : score >= 40 ? '#ffbf1f' : '#35f28c'
        const isSelected = selectedSat && (selectedSat.id === s.id || selectedSat.name === s.name)

        return (
          <div
            key={s.id || s.name || i}
            onClick={() => onSelect?.(s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 6px',
              borderRadius: 6,
              background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
              border: isSelected ? '1px solid rgba(0, 240, 255, 0.35)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 140ms ease',
            }}
          >
            {/* Name */}
            <div
              style={{
                width: 110,
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: isSelected ? 'var(--neonC)' : '#cbd5e1',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={s.name}
            >
              {s.name}
            </div>

            {/* Orbit Pill */}
            <span
              style={{
                fontSize: 9,
                fontFamily: 'var(--mono)',
                padding: '1px 4px',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                flexShrink: 0,
              }}
            >
              {s.orbit || 'LEO'}
            </span>

            {/* Gradient Bar */}
            <div
              style={{
                flex: 1,
                height: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(pct / max) * 100}%`,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${hex}77, ${hex})`,
                  boxShadow: pct >= 70 ? `0 0 6px ${hex}88` : 'none',
                  transition: 'width 600ms ease',
                }}
              />
            </div>

            {/* Score */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--mono)',
                color: hex,
                minWidth: 32,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {score.toFixed(1)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [satellites, setSatellites] = useState([])
  const [isLoadingSats, setIsLoadingSats] = useState(true)
  const [satError, setSatError] = useState('')

  // Viewport mode: '3d-globe' | 'solar-disk' | 'corridors'
  const [viewportMode, setViewportMode] = useState('3d-globe')

  // Selected satellite for detailed tactical inspection
  const [selectedSat, setSelectedSat] = useState(null)
  const handleSelectSatellite = useCallback((sat) => {
    setSelectedSat(sat)
  }, [])

  // Satellite search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [orbitFilter, setOrbitFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')

  // Telemetry Context (shared, live, zero duplication)
  const {
    infraData,
    solarWindSpeed,
    kpIndex,
    flareClass,
    stormClass,
    gridTriggers,
    aviationAlerts,
    loading: teleLoading,
    error: teleError,
    lastUpdated,
    refreshTelemetry,
  } = useTelemetry()

  // Solar Prediction Context (shared, live, zero duplication)
  const {
    prediction,
    healthLoading,
    checkHealth,
  } = useSolarPrediction()

  // Fetch full satellite catalog from /api/helio-risk
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoadingSats(true)
      setSatError('')
      try {
        const data = await fetchHelioRiskSatellites()
        if (!cancelled) {
          setSatellites(data || [])
          if (data && data.length > 0) {
            setSelectedSat((current) => current || data[0])
          }
        }
      } catch (err) {
        if (!cancelled) setSatError(err.message || 'Failed to load satellites from /api/helio-risk.')
      } finally {
        if (!cancelled) setIsLoadingSats(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Sync handler
  const handleManualSync = useCallback(async () => {
    await Promise.allSettled([
      refreshTelemetry?.(),
      checkHealth?.(),
    ])
  }, [refreshTelemetry, checkHealth])

  // Data Freshness & Stale Calculation
  const isStale = useMemo(() => {
    if (!lastUpdated) return false
    return Date.now() - new Date(lastUpdated).getTime() > 60000
  }, [lastUpdated])

  const formattedSyncTime = useMemo(() => {
    if (!lastUpdated) return 'Syncing...'
    return new Date(lastUpdated).toLocaleTimeString()
  }, [lastUpdated])

  // Calculated 1 AU Parker Spiral transit duration (theoretical derived)
  const transitHours = useMemo(() => {
    const speed = parseFloat(solarWindSpeed)
    if (!Number.isFinite(speed) || speed <= 0) return null
    return Math.round(149597870 / (speed * 3600))
  }, [solarWindSpeed])

  // Derived DEFCON level based on Kp index
  const defconLevel = useMemo(() => {
    const kp = parseFloat(kpIndex)
    if (!Number.isFinite(kp)) return 4
    if (kp >= 8) return 1
    if (kp >= 6) return 2
    if (kp >= 4) return 3
    if (kp >= 3) return 4
    return 5
  }, [kpIndex])

  // Satellite filtering and sorting
  const filteredSatellites = useMemo(() => {
    return satellites
      .filter((s) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const name = String(s.name || '').toLowerCase()
          const orbit = String(s.orbit || '').toLowerCase()
          if (!name.includes(q) && !orbit.includes(q)) return false
        }
        if (orbitFilter !== 'ALL') {
          const orbit = String(s.orbit || '').toUpperCase()
          if (!orbit.includes(orbitFilter)) return false
        }
        if (riskFilter !== 'ALL') {
          const score = Number(s.risk_score ?? s.riskScore) || 0
          if (riskFilter === 'CRITICAL' && score < 70) return false
          if (riskFilter === 'ELEVATED' && (score < 40 || score >= 70)) return false
          if (riskFilter === 'NOMINAL' && score >= 40) return false
        }
        return true
      })
      .sort((a, b) => (Number(b.risk_score ?? b.riskScore) || 0) - (Number(a.risk_score ?? a.riskScore) || 0))
  }, [satellites, searchQuery, orbitFilter, riskFilter])

  // Flare risk accent color
  const riskAccent = useMemo(() => {
    const lvl = String(prediction?.riskLevel || prediction?.risk_level || '').toUpperCase()
    if (lvl === 'HIGH') return 'var(--risk-high)'
    if (lvl === 'MEDIUM') return 'var(--risk-med)'
    return 'var(--risk-low)'
  }, [prediction])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '16px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main dashboard-root">
            {/* ══════════════════════════════════════════════════════════
                1. CONTINUOUS CINEMATIC HUD TOP DECK
            ══════════════════════════════════════════════════════════ */}
            <header className="dash-continuity-deck">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="dash-back-link"
                  onClick={() => navigate('/')}
                  title="Return to the cinematic scroll landing sequence"
                >
                  <ArrowLeft size={14} />
                  <span>Cinematic Sequence</span>
                </button>

                <div className="dash-deck-title">
                  <h1>
                    <Activity size={18} color="var(--neonC)" />
                    Operations Mission Control
                  </h1>
                </div>
              </div>

              <div className="dash-deck-meta">
                {/* Data Pipeline State */}
                <div
                  className={`dash-freshness-pill ${isStale ? 'stale' : ''}`}
                  title={isStale ? 'Telemetry stream older than 60s' : 'Live telemetry stream sync'}
                >
                  <span
                    className={`pill-dot ${teleLoading ? 'syncing' : teleError ? 'error' : ''}`}
                    style={{
                      background: teleLoading ? '#ffbf1f' : teleError ? '#ff5c8a' : '#38ef7d',
                    }}
                  />
                  <span>
                    {teleLoading
                      ? 'Connecting…'
                      : teleError
                      ? 'Stream Degraded'
                      : isStale
                      ? `Stale Feed (${formattedSyncTime})`
                      : `Synced ${formattedSyncTime}`}
                  </span>
                </div>

                {/* Simulation Indicator if active */}
                {infraData?.simulation_active && (
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'rgba(255, 191, 31, 0.15)',
                      color: '#ffbf1f',
                      border: '1px solid rgba(255, 191, 31, 0.4)',
                    }}
                  >
                    SIMULATION MODE ACTIVE
                  </span>
                )}

                {/* Manual Refresh Button */}
                <button
                  type="button"
                  className="dash-sync-btn"
                  onClick={handleManualSync}
                  disabled={teleLoading || healthLoading}
                  title="Force telemetry and AI health polling refresh"
                >
                  <RefreshCw
                    size={12}
                    className={teleLoading || healthLoading ? 'syncing-spinner' : ''}
                  />
                  <span>Refresh Feeds</span>
                </button>
              </div>
            </header>

            {/* Error banner if telemetry endpoint failed */}
            {teleError && (
              <div className="dash-error-state">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={16} />
                  <span>
                    <strong>Telemetry Pipeline Alert:</strong> {teleError} — displaying cached or safe baseline readouts.
                  </span>
                </div>
                <button
                  type="button"
                  className="dash-sync-btn"
                  onClick={handleManualSync}
                  style={{ borderColor: 'rgba(255, 59, 59, 0.4)', color: '#ffffff' }}
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                2. RAPID TACTICAL COMMAND PORTALS
            ══════════════════════════════════════════════════════════ */}
            <section className="dash-command-portals">
              <Link to="/flare-impact" className="dash-portal-chip">
                <div className="dash-portal-info">
                  <div className="dash-portal-name">Flare Impact Center</div>
                  <div className="dash-portal-sub">Tri-source ML & Grid Risk</div>
                </div>
                <span className="dash-portal-badge">
                  {flareClass || (teleLoading ? 'Syncing…' : 'Nominal')}
                </span>
              </Link>

              <Link to="/analytics" className="dash-portal-chip">
                <div className="dash-portal-info">
                  <div className="dash-portal-name">Earth Threat Center</div>
                  <div className="dash-portal-sub">Heliospheric Corridors</div>
                </div>
                <span className="dash-portal-badge" style={{ color: '#38ef7d', borderColor: 'rgba(56, 239, 125, 0.3)' }}>
                  {aviationAlerts?.length ?? 0} Alerts Active
                </span>
              </Link>

              <Link to="/magstorm" className="dash-portal-chip">
                <div className="dash-portal-info">
                  <div className="dash-portal-name">MagStorm Shield</div>
                  <div className="dash-portal-sub">Planetary Defcon & ETA</div>
                </div>
                <span className="dash-portal-badge" style={{ color: '#ffbf1f', borderColor: 'rgba(255, 191, 31, 0.3)' }}>
                  DEFCON {defconLevel}
                </span>
              </Link>

              <Link to="/grid-heatmap" className="dash-portal-chip">
                <div className="dash-portal-info">
                  <div className="dash-portal-name">Grid Heatmap</div>
                  <div className="dash-portal-sub">14 Regional Substations</div>
                </div>
                <span className="dash-portal-badge">
                  {gridTriggers?.length ?? 14} Monitored Nodes
                </span>
              </Link>
            </section>

            {/* ══════════════════════════════════════════════════════════
                3. COMPACT HIGH-DENSITY MISSION HUD TELEMETRY STRIP
            ══════════════════════════════════════════════════════════ */}
            <section className="dash-hud-strip">
              {/* Solar Wind Velocity */}
              <div className="dash-hud-tile" style={{ '--tile-accent': 'var(--neonC)' }}>
                <div className="dash-hud-tile-top">
                  <span className="dash-hud-tile-label">Solar Wind Speed</span>
                  <span className="dash-hud-tile-origin">OBSERVED</span>
                </div>
                <div className="dash-hud-tile-val">
                  {solarWindSpeed != null
                    ? String(solarWindSpeed).includes('km/s')
                      ? solarWindSpeed
                      : `${solarWindSpeed} km/s`
                    : teleLoading
                    ? 'Syncing…'
                    : 'Unavailable'}
                </div>
                <div className="dash-hud-tile-sub">
                  <span>ACE/DSCOVR Deep Space Probe</span>
                </div>
              </div>

              {/* Planetary Kp Index */}
              <div className="dash-hud-tile" style={{ '--tile-accent': '#7c3aed' }}>
                <div className="dash-hud-tile-top">
                  <span className="dash-hud-tile-label">Planetary Kp Index</span>
                  <span className="dash-hud-tile-origin">OBSERVED</span>
                </div>
                <div className="dash-hud-tile-val">
                  {kpIndex != null ? `${kpIndex} Kp` : teleLoading ? 'Syncing…' : 'Unavailable'}
                </div>
                <div className="dash-hud-tile-sub">
                  <span>Geomagnetic Activity Tier: {stormClass || (kpIndex >= 5 ? 'Storm' : 'Nominal')}</span>
                </div>
              </div>

              {/* Active Flare Classification */}
              <div className="dash-hud-tile" style={{ '--tile-accent': riskAccent }}>
                <div className="dash-hud-tile-top">
                  <span className="dash-hud-tile-label">Active Flare Class</span>
                  <span className="dash-hud-tile-origin">AI MODEL</span>
                </div>
                <div className="dash-hud-tile-val" style={{ color: riskAccent }}>
                  {prediction?.flareClass || prediction?.flare_class || flareClass || (teleLoading ? 'Syncing…' : 'Quiet')}
                </div>
                <div className="dash-hud-tile-sub">
                  <span>
                    Confidence: {(prediction?.confidenceScore ?? prediction?.confidence_score)?.toFixed?.(1) ?? '—'}%
                  </span>
                </div>
              </div>

              {/* Polar Aviation Corridors */}
              <div className="dash-hud-tile" style={{ '--tile-accent': '#38ef7d' }}>
                <div className="dash-hud-tile-top">
                  <span className="dash-hud-tile-label">Aviation Corridors</span>
                  <span className="dash-hud-tile-origin">OBSERVED</span>
                </div>
                <div className="dash-hud-tile-val">
                  {aviationAlerts ? `${aviationAlerts.length} Routes` : teleLoading ? 'Syncing…' : '0 Routes'}
                </div>
                <div className="dash-hud-tile-sub">
                  <span>HF Radio & Polar Navigation Status</span>
                </div>
              </div>

              {/* 1 AU Parker Spiral Transit */}
              <div className="dash-hud-tile" style={{ '--tile-accent': '#22d3ee' }}>
                <div className="dash-hud-tile-top">
                  <span className="dash-hud-tile-label">1 AU Transit (v)</span>
                  <span className="dash-hud-tile-origin">DERIVED</span>
                </div>
                <div className="dash-hud-tile-val">
                  {transitHours ? `~${transitHours} Hours` : teleLoading ? 'Syncing…' : '—'}
                </div>
                <div className="dash-hud-tile-sub">
                  <span>Derived: 149.6M km / Solar Wind Velocity</span>
                </div>
              </div>

              {/* Pipeline Status */}
              <div className="dash-hud-tile" style={{ '--tile-accent': '#35f28c' }}>
                <div className="dash-hud-tile-top">
                  <span className="dash-hud-tile-label">Data Pipeline</span>
                  <span className="dash-hud-tile-origin">STATUS</span>
                </div>
                <div className="dash-hud-tile-val" style={{ color: '#38ef7d' }}>
                  {infraData?.pipeline_status || (teleLoading ? 'Syncing…' : 'ONLINE')}
                </div>
                <div className="dash-hud-tile-sub">
                  <span>Multi-Tier V1/V2/V3 Backend Mesh</span>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                4. PRIMARY TACTICAL WORKSPACE (2-COLUMN GRID)
            ══════════════════════════════════════════════════════════ */}
            <div className="dash-workspace-grid">
              {/* ── LEFT COLUMN: Tactical Centerpiece Viewport + AI Command Deck ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Tactical Viewport Card */}
                <div className="dash-tactical-viewport">
                  <div className="dash-viewport-header">
                    <div className="dash-viewport-title">
                      <Crosshair size={15} color="var(--neonC)" />
                      <span>TACTICAL MISSION VIEWPORT</span>
                    </div>

                    <div className="dash-viewport-tabs">
                      <button
                        type="button"
                        className={`dash-viewport-tab ${viewportMode === '3d-globe' ? 'active' : ''}`}
                        onClick={() => setViewportMode('3d-globe')}
                      >
                        3D Orbital Earth
                      </button>
                      <button
                        type="button"
                        className={`dash-viewport-tab ${viewportMode === 'solar-disk' ? 'active' : ''}`}
                        onClick={() => setViewportMode('solar-disk')}
                      >
                        Solar Disk AI
                      </button>
                    </div>
                  </div>

                  <div className="dash-viewport-stage">
                    {/* Viewport Canvas or Component */}
                    {viewportMode === '3d-globe' ? (
                      <div className="dash-viewport-canvas-wrap">
                        {isLoadingSats ? (
                          <div className="dash-empty-state" style={{ height: '100%', justifyContent: 'center' }}>
                            <div className="pill-dot syncing" style={{ width: 12, height: 12, background: 'var(--neonC)' }} />
                            <span>Rendering 3D Tactical Orbital Globe…</span>
                          </div>
                        ) : (
                          <GlobeRiskScene
                            satellites={filteredSatellites}
                            selectedSatellite={selectedSat}
                            showOverlay={true}
                            onSelectSatellite={handleSelectSatellite}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="dash-viewport-canvas-wrap" style={{ padding: 16, overflowY: 'auto' }}>
                        <SolarDiskViewer
                          anomalyLocalization={prediction?.anomaly || prediction?.anomaly_localization}
                          riskLevel={prediction?.riskLevel || prediction?.risk_level}
                          flareClass={prediction?.flareClass || prediction?.flare_class}
                        />
                      </div>
                    )}

                    {/* HUD Reticle Overlay */}
                    <div className="dash-viewport-hud-overlay">
                      <div className="dash-viewport-reticle">
                        <div className="dash-hud-corner tl" />
                        <span className="dash-viewport-status-tag">
                          <Radio size={10} className="syncing-spinner" />
                          {viewportMode === '3d-globe'
                            ? `TRACKING ${filteredSatellites.length} ORBITAL OBJECTS`
                            : `REGION: ${prediction?.anomaly?.regionName || prediction?.anomaly_localization?.region_name || 'STABLE MATRIX'}`}
                        </span>
                        <div className="dash-hud-corner tr" />
                      </div>

                      <div className="dash-viewport-reticle">
                        <div className="dash-hud-corner bl" />
                        <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: '#94a3b8' }}>
                          GRID: WGS-84 / SPHERICAL PROJECTION
                        </span>
                        <div className="dash-hud-corner br" />
                      </div>
                    </div>
                  </div>

                  <div className="dash-viewport-footer">
                    <span>
                      {viewportMode === '3d-globe'
                        ? 'Drag to rotate Earth · Click satellite dot to lock telemetry'
                        : 'Visualized active magnetic sunspot complexes from SOHO'}
                    </span>
                    <span style={{ color: 'var(--neonC)' }}>
                      {selectedSat ? `LOCK: ${selectedSat.name}` : 'AWAITING SELECTION'}
                    </span>
                  </div>
                </div>

                {/* AI Solar Flare Prediction Command Deck */}
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <div className="dash-panel-title">
                      <Zap size={16} color="var(--neonC)" />
                      <span>AI Solar Flare Forecasting Matrix</span>
                    </div>
                    <span className="data-origin-badge prediction">MODEL INFERENCE · V3 API</span>
                  </div>

                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                    Real-time neural network inference evaluating magnetogram flux gradients and localized coronal flares.
                  </div>

                  {/* Scientific Causality Callout */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(56, 239, 125, 0.06)',
                      border: '1px solid rgba(56, 239, 125, 0.25)',
                      fontSize: 11,
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <CheckCircle size={15} color="#38ef7d" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Scientific Advisory:</strong> Flare classification forecasts electromagnetic photon flux arriving at <i>c</i> (~8.3 min). It does not guarantee a Coronal Mass Ejection (CME) or terrestrial geomagnetic storm.
                    </span>
                  </div>

                  {/* Reused AIPredictionPanel with full live & upload controls */}
                  <AIPredictionPanel />
                </div>
              </div>

              {/* ── RIGHT COLUMN: Satellite Analytical Fleet & Surface Impacts ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Satellite Risk Leaderboard & Filterable Table */}
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <div className="dash-panel-title">
                      <Satellite size={16} color="var(--neonC)" />
                      <span>Orbital Fleet Vulnerability Index</span>
                    </div>
                    <span className="data-origin-badge observed">NORAD V1 API</span>
                  </div>

                  {/* Search and Filters */}
                  <div className="dash-table-controls">
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search
                        size={12}
                        color="#94a3b8"
                        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        placeholder="Search satellites…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="dash-search-input"
                        style={{ paddingLeft: 26, width: '100%' }}
                      />
                    </div>

                    <div className="dash-filter-chips">
                      {['ALL', 'LEO', 'GEO', 'MEO'].map((orb) => (
                        <button
                          key={orb}
                          type="button"
                          className={`dash-filter-chip ${orbitFilter === orb ? 'active' : ''}`}
                          onClick={() => setOrbitFilter(orb)}
                        >
                          {orb}
                        </button>
                      ))}
                    </div>

                    <div className="dash-filter-chips">
                      {['ALL', 'CRITICAL', 'ELEVATED'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`dash-filter-chip ${riskFilter === lvl ? 'active' : ''}`}
                          onClick={() => setRiskFilter(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Satellite Details Drawer */}
                  {selectedSat && (
                    <div className="dash-sat-details-drawer">
                      <div className="dash-sat-details-item">
                        <span className="dash-sat-details-label">Target Name</span>
                        <span className="dash-sat-details-val" style={{ color: 'var(--neonC)' }}>
                          {selectedSat.name}
                        </span>
                      </div>
                      <div className="dash-sat-details-item">
                        <span className="dash-sat-details-label">Orbit / Altitude</span>
                        <span className="dash-sat-details-val">
                          {selectedSat.orbit || 'LEO'} · {selectedSat.altitudeKm ?? selectedSat.alt ? `${selectedSat.altitudeKm ?? selectedSat.alt} km` : '—'}
                        </span>
                      </div>
                      <div className="dash-sat-details-item">
                        <span className="dash-sat-details-label">Velocity</span>
                        <span className="dash-sat-details-val">
                          {selectedSat.velocityKms ? `${selectedSat.velocityKms} km/s` : '—'}
                        </span>
                      </div>
                      <div className="dash-sat-details-item">
                        <span className="dash-sat-details-label">Risk Score</span>
                        <span
                          className="dash-sat-details-val"
                          style={{
                            color:
                              (selectedSat.risk_score ?? selectedSat.riskScore) >= 70
                                ? '#ff3b3b'
                                : (selectedSat.risk_score ?? selectedSat.riskScore) >= 40
                                ? '#ffbf1f'
                                : '#35f28c',
                          }}
                        >
                          {Number(selectedSat.risk_score ?? selectedSat.riskScore ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Satellite Table */}
                  {isLoadingSats ? (
                    <div className="dash-empty-state">
                      <div className="pill-dot syncing" style={{ width: 10, height: 10, background: 'var(--neonC)' }} />
                      <span>Querying /api/helio-risk telemetry feeds…</span>
                    </div>
                  ) : satError ? (
                    <div className="dash-empty-state" style={{ color: '#ff5c8a', borderColor: 'rgba(255, 92, 138, 0.4)' }}>
                      <span>{satError}</span>
                    </div>
                  ) : filteredSatellites.length === 0 ? (
                    <div className="dash-empty-state">
                      <span>No satellites match your active filter criteria.</span>
                    </div>
                  ) : (
                    <div className="dash-sat-table-wrap">
                      <table className="dash-sat-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Satellite Name</th>
                            <th>Orbit</th>
                            <th>Tier</th>
                            <th>Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSatellites.slice(0, 15).map((s, idx) => {
                            const score = Number(s.risk_score ?? s.riskScore) || 0
                            const isSelected = selectedSat && (selectedSat.id === s.id || selectedSat.name === s.name)
                            return (
                              <tr
                                key={s.id || s.name || idx}
                                className={isSelected ? 'selected' : ''}
                                onClick={() => setSelectedSat(s)}
                              >
                                <td style={{ color: '#94a3b8', fontFamily: 'var(--mono)' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 650, color: '#ffffff' }}>{s.name}</td>
                                <td style={{ color: '#94a3b8', fontFamily: 'var(--mono)' }}>{s.orbit || 'LEO'}</td>
                                <td>
                                  <RiskBadge level={s.level} />
                                </td>
                                <td
                                  style={{
                                    fontFamily: 'var(--mono)',
                                    fontWeight: 700,
                                    color: score >= 70 ? '#ff3b3b' : score >= 40 ? '#ffbf1f' : '#35f28c',
                                  }}
                                >
                                  {score.toFixed(1)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Satellite Risk Spectrum Distribution */}
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <div className="dash-panel-title">
                      <Activity size={15} color="var(--neonC)" />
                      <span>Fleet Risk Distribution Spectrum</span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#94a3b8' }}>TOP RISK</span>
                  </div>

                  <SatRiskMiniChart
                    satellites={satellites}
                    selectedSat={selectedSat}
                    onSelect={(s) => setSelectedSat(s)}
                  />
                </div>

                {/* Terrestrial Impact: Aviation & Corridor Alerts */}
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <div className="dash-panel-title">
                      <Plane size={15} color="var(--neonC)" />
                      <span>Polar Flight Corridor Radiation Alerts</span>
                    </div>
                    <span className="data-origin-badge observed">LIVE V2 FEED</span>
                  </div>

                  <div className="dash-alerts-list">
                    {aviationAlerts && aviationAlerts.length > 0 ? (
                      aviationAlerts.map((a, idx) => {
                        const statusUpper = String(a.status || '').toUpperCase()
                        const isCritical = statusUpper === 'CRITICAL' || statusUpper === 'RE-ROUTED'
                        const isWarning = statusUpper === 'WARNING'
                        const alertClass = isCritical ? 'critical' : isWarning ? 'warning' : 'nominal'

                        return (
                          <div key={a.route_id || idx} className={`dash-alert-card ${alertClass}`}>
                            <div className="dash-alert-top">
                              <div className="dash-alert-route">
                                <Plane size={13} color={isCritical ? '#ff3b3b' : isWarning ? '#ffbf1f' : 'var(--neonC)'} />
                                <span>{a.route_id}</span>
                              </div>
                              <RiskBadge level={isCritical ? 'high' : isWarning ? 'medium' : 'low'} />
                            </div>

                            <div className="dash-alert-action">
                              {a.action || 'Optimal atmospheric ionization. Normal operations.'}
                            </div>

                            <div className="dash-alert-meta">
                              <span>Status: {a.status || 'NOMINAL'}</span>
                              <span>Corridor: Polar 60°N+</span>
                            </div>
                          </div>
                        )
                      })
                    ) : teleLoading ? (
                      <div className="dash-empty-state">
                        <span>Syncing live aviation corridor advisories…</span>
                      </div>
                    ) : (
                      <div className="dash-empty-state">
                        <CheckCircle size={18} color="#35f28c" />
                        <span>All monitored polar aviation flight corridors operating nominally.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terrestrial Power Grid Substation Heatmap Summary */}
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <div className="dash-panel-title">
                      <Zap size={15} color="#ffbf1f" />
                      <span>Regional Power Grid Heatmap Status</span>
                    </div>
                    <Link
                      to="/grid-heatmap"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--neonC)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      <span>Interactive Heatmap</span>
                      <ChevronRight size={13} />
                    </Link>
                  </div>

                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Monitoring GIC (Geomagnetically Induced Currents) and harmonic voltage stability across regional transformers:
                  </div>

                  <div className="dash-grid-nodes-wrap">
                    {(gridTriggers && gridTriggers.length > 0 ? gridTriggers : [
                      { region: 'Northern Intertie', risk_index: 'Nominal', freq: '60.00 Hz' },
                      { region: 'Quebec Hydro Grid', risk_index: 'Nominal', freq: '60.01 Hz' },
                      { region: 'Nordic 400kV Mesh', risk_index: 'Nominal', freq: '50.00 Hz' },
                      { region: 'Mid-Atlantic PJM', risk_index: 'Nominal', freq: '59.99 Hz' },
                      { region: 'BPA Pacific AC/DC', risk_index: 'Nominal', freq: '60.00 Hz' },
                      { region: 'Scottish Supergrid', risk_index: 'Nominal', freq: '50.01 Hz' },
                    ]).map((node, i) => (
                      <div key={node.region || i} className="dash-grid-node-chip">
                        <div className="dash-grid-node-name">{node.region}</div>
                        <div className="dash-grid-node-risk">
                          GIC: <span style={{ color: '#38ef7d' }}>{node.risk_index || 'Nominal'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
