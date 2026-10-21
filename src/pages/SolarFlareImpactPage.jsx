import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Zap,
  Plane,
  Satellite,
  RefreshCw,
  AlertTriangle,
  Radio,
  MapPin,
  Shield,
  Layers,
  Search,
  ExternalLink,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import SolarDiskViewer from '../components/SolarDiskViewer'
import GridImpactMap from '../components/GridImpactMap'
import { fetchLivePrediction, fetchInfrastructureImpact } from '../utils/solarPredictionApi'
import { fetchFullHelioRisk } from '../utils/helioApi'
import '../styles/flareImpact.css'

/* ── Helpers ── */
function formatTimestamp(d) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function alertLevelClass(level) {
  const v = String(level || '').toUpperCase()
  if (v === 'RED' || v === 'CRITICAL') return 'red'
  if (v === 'ORANGE') return 'orange'
  if (v === 'YELLOW' || v === 'WARNING') return 'yellow'
  return 'green'
}

function aviationStatusColor(status) {
  const v = String(status || '').toUpperCase()
  if (v === 'NOMINAL') return 'var(--risk-low)'
  if (v === 'WARNING') return 'var(--risk-med)'
  if (v === 'RE-ROUTED' || v === 'CRITICAL') return 'var(--risk-high)'
  return 'var(--muted)'
}

function riskLevelColor(level) {
  const v = String(level || '').toUpperCase()
  if (v === 'HIGH' || v === 'CRITICAL') return 'var(--risk-high)'
  if (v === 'MEDIUM' || v === 'MODERATE') return 'var(--risk-med)'
  return 'var(--risk-low)'
}

export default function SolarFlareImpactPage() {
  // ── Source 1: Live Flare Prediction ──
  const [flareData, setFlareData] = useState(null)
  const [flareLoading, setFlareLoading] = useState(true)
  const [flareError, setFlareError] = useState('')
  const [flareLastUpdated, setFlareLastUpdated] = useState(null)

  // ── Source 2: Infrastructure & Aviation Impacts ──
  const [infraData, setInfraData] = useState(null)
  const [infraLoading, setInfraLoading] = useState(true)
  const [infraError, setInfraError] = useState('')
  const [infraLastUpdated, setInfraLastUpdated] = useState(null)

  // ── Source 3: Satellite Risk ──
  const [satData, setSatData] = useState(null)
  const [satLoading, setSatLoading] = useState(true)
  const [satError, setSatError] = useState('')
  const [satLastUpdated, setSatLastUpdated] = useState(null)
  const [satViewMode, setSatViewMode] = useState('curated') // 'curated' | 'all'
  const [satSearch, setSatSearch] = useState('')

  // ── UI States ──
  const [selectedGridTrigger, setSelectedGridTrigger] = useState(null)
  const [aviationFilter, setAviationFilter] = useState('ALL')
  const [aviationSearch, setAviationSearch] = useState('')
  const [gridSortDir, setGridSortDir] = useState('desc') // 'desc' | 'asc'

  // ── Fetchers ──
  const loadFlarePrediction = useCallback(async () => {
    setFlareLoading(true)
    setFlareError('')
    try {
      const data = await fetchLivePrediction()
      setFlareData(data)
      setFlareLastUpdated(new Date())
    } catch (err) {
      setFlareError(err?.response?.data?.detail || err.message || 'Live flare prediction request failed.')
    } finally {
      setFlareLoading(false)
    }
  }, [])

  const loadInfrastructureImpact = useCallback(async () => {
    setInfraLoading(true)
    setInfraError('')
    try {
      const data = await fetchInfrastructureImpact('live')
      setInfraData(data)
      setInfraLastUpdated(new Date())
    } catch (err) {
      setInfraError(err?.response?.data?.detail || err.message || 'Infrastructure impact request failed.')
    } finally {
      setInfraLoading(false)
    }
  }, [])

  const loadSatelliteRisk = useCallback(async () => {
    setSatLoading(true)
    setSatError('')
    try {
      const data = await fetchFullHelioRisk()
      setSatData(data)
      setSatLastUpdated(new Date())
    } catch (err) {
      setSatError(err?.response?.data?.detail || err.message || 'Satellite risk request failed.')
    } finally {
      setSatLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadFlarePrediction()
    loadInfrastructureImpact()
    loadSatelliteRisk()
  }, [loadFlarePrediction, loadInfrastructureImpact, loadSatelliteRisk])

  const refreshAll = useCallback(() => {
    loadFlarePrediction()
    loadInfrastructureImpact()
    loadSatelliteRisk()
  }, [loadFlarePrediction, loadInfrastructureImpact, loadSatelliteRisk])

  const isAnyLoading = flareLoading || infraLoading || satLoading

  // ── Process Grid Triggers ──
  const gridTriggers = useMemo(() => {
    const list = infraData?.grid_heatmap_triggers ?? []
    if (!Array.isArray(list)) return []
    return [...list].sort((a, b) => {
      const vA = Number(a?.value) || 0
      const vB = Number(b?.value) || 0
      return gridSortDir === 'desc' ? vB - vA : vA - vB
    })
  }, [infraData, gridSortDir])

  // Select first trigger by default if none selected
  useEffect(() => {
    if (gridTriggers.length > 0 && !selectedGridTrigger) {
      setSelectedGridTrigger(gridTriggers[0])
    }
  }, [gridTriggers, selectedGridTrigger])

  // ── Process Aviation Alerts ──
  const aviationAlerts = useMemo(() => {
    const list = infraData?.aviation_alerts ?? []
    if (!Array.isArray(list)) return []
    return list.filter((item) => {
      if (!item) return false
      const matchesFilter =
        aviationFilter === 'ALL' || String(item.status || '').toUpperCase() === aviationFilter
      const q = aviationSearch.trim().toLowerCase()
      const matchesSearch =
        !q ||
        String(item.route_id || '').toLowerCase().includes(q) ||
        String(item.action || '').toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [infraData, aviationFilter, aviationSearch])

  // ── Process Satellites ──
  const displayedSatellites = useMemo(() => {
    const baseList =
      satViewMode === 'curated'
        ? satData?.curated_top_10 ?? []
        : satData?.all_satellites ?? satData?.curated_top_10 ?? []

    if (!Array.isArray(baseList)) return []

    let filtered = baseList
    if (satSearch.trim()) {
      const q = satSearch.trim().toLowerCase()
      filtered = filtered.filter(
        (s) =>
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.recommendation || '').toLowerCase().includes(q) ||
          String(s.status || '').toLowerCase().includes(q)
      )
    }

    // Sort by risk score descending
    return [...filtered].sort((a, b) => (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0))
  }, [satData, satViewMode, satSearch])

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar
              title="Solar Flare Impact Center"
              subtitle="Coordinated assessment across Solar Flare AI Prediction, Terrestrial Grid & Aviation, and Orbital Assets"
            />

            <div className="sfi-page" style={{ marginTop: 18 }}>
              {/* ══════════════════════════════════════════════════════════════════
                  HEADER COMMAND PANEL & SOURCE STATUS PIPELINES
              ══════════════════════════════════════════════════════════════════ */}
              <div className="sfi-header-panel">
                <div className="sfi-header-top">
                  <div className="sfi-title-wrap">
                    <span className="sfi-title-badge">
                      <Radio size={12} /> Real-Time Cross-Domain Intelligence
                    </span>
                    <h2 className="sfi-title">Solar Flare Impact Operations Center</h2>
                    <p className="sfi-subtitle">
                      Correlating solar disk anomaly localization with terrestrial electrical infrastructure,
                      high-latitude aviation flight routes, and high-risk satellite assets.
                    </p>
                  </div>

                  <div className="sfi-header-actions">
                    <button
                      className="sfi-btn primary"
                      onClick={refreshAll}
                      disabled={isAnyLoading}
                      title="Sync all live space weather endpoints"
                    >
                      <RefreshCw size={14} className={isAnyLoading ? 'sfi-spin' : ''} />
                      {isAnyLoading ? 'Synchronizing…' : 'Sync All Telemetry'}
                    </button>
                  </div>
                </div>

                {/* Distinct 3-Source Status Chips */}
                <div className="sfi-source-chips">
                  {/* Source 1 */}
                  <div className="sfi-source-chip">
                    <div className="sfi-source-chip-left">
                      <span
                        className={`sfi-source-dot ${
                          flareLoading ? 'loading' : flareError ? 'error' : 'live'
                        }`}
                      />
                      <div>
                        <div className="sfi-source-name">1. Solar Flare AI</div>
                        <div className="sfi-source-time">
                          {flareLoading
                            ? 'Scanning NASA SOHO…'
                            : flareError
                            ? 'Connection offline'
                            : `Updated: ${formatTimestamp(flareLastUpdated)}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      POST /predict-live
                    </span>
                  </div>

                  {/* Source 2 */}
                  <div className="sfi-source-chip">
                    <div className="sfi-source-chip-left">
                      <span
                        className={`sfi-source-dot ${
                          infraLoading ? 'loading' : infraError ? 'error' : 'live'
                        }`}
                      />
                      <div>
                        <div className="sfi-source-name">2. Grid & Aviation</div>
                        <div className="sfi-source-time">
                          {infraLoading
                            ? 'Querying Grid Matrix…'
                            : infraError
                            ? 'Impact API offline'
                            : `Updated: ${formatTimestamp(infraLastUpdated)}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      GET /infrastructure/impact
                    </span>
                  </div>

                  {/* Source 3 */}
                  <div className="sfi-source-chip">
                    <div className="sfi-source-chip-left">
                      <span
                        className={`sfi-source-dot ${
                          satLoading ? 'loading' : satError ? 'error' : 'live'
                        }`}
                      />
                      <div>
                        <div className="sfi-source-name">3. Satellite Risk</div>
                        <div className="sfi-source-time">
                          {satLoading
                            ? 'Querying NORAD Fleet…'
                            : satError
                            ? 'Helio API offline'
                            : `Updated: ${formatTimestamp(satLastUpdated)}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                      GET /helio-risk
                    </span>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════════
                  SOURCE 1: LIVE FLARE PREDICTION & SOLAR DISK LOCALIZATION
              ══════════════════════════════════════════════════════════════════ */}
              <section className="sfi-section-card glass neon-border">
                <div className="sfi-section-header">
                  <div className="sfi-section-title-group">
                    <div className="sfi-section-icon" style={{ color: '#ffbf1f', borderColor: 'rgba(255, 191, 31, 0.3)' }}>
                      <Sun size={20} />
                    </div>
                    <div>
                      <h3 className="sfi-section-heading">1. Live Solar Flare Prediction & Anomaly Localization</h3>
                      <div className="sfi-section-sub">
                        Target API: POST https://solar-sentinel-v3.onrender.com/api/v1/ai/predict-live
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className={`sfi-status-badge ${
                        flareLoading ? 'loading' : flareError ? 'error' : 'healthy'
                      }`}
                    >
                      {flareLoading ? 'Scanning…' : flareError ? 'Error' : 'Telemetry Live'}
                    </span>
                    <button
                      className="sfi-btn"
                      onClick={loadFlarePrediction}
                      disabled={flareLoading}
                      title="Refresh live prediction"
                    >
                      <RefreshCw size={12} className={flareLoading ? 'sfi-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {flareError && (
                  <div className="sfi-error-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} />
                      <span>{flareError}</span>
                    </div>
                    <button className="sfi-btn" onClick={loadFlarePrediction}>
                      Retry Prediction
                    </button>
                  </div>
                )}

                {flareLoading && !flareData ? (
                  <div className="sfi-fallback-box">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--neonC)',
                        animation: 'sfiSpin 0.9s linear infinite',
                      }}
                    />
                    <div>Analyzing real-time NASA SOHO solar flux telemetry…</div>
                  </div>
                ) : flareData ? (
                  <>
                    {/* Live Prediction Core Metrics */}
                    <div className="sfi-metrics-grid">
                      {/* Flare Class */}
                      <div className="sfi-metric-card" style={{ borderLeft: '3px solid #ff7b22' }}>
                        <span className="sfi-metric-label">Flare Class</span>
                        <span
                          className="sfi-metric-value"
                          style={{
                            color:
                              flareData.risk_level?.toUpperCase() === 'HIGH'
                                ? 'var(--risk-high)'
                                : flareData.risk_level?.toUpperCase() === 'MEDIUM'
                                ? 'var(--risk-med)'
                                : 'var(--risk-low)',
                          }}
                        >
                          {flareData.flare_class || '—'}
                        </span>
                        <span className="sfi-metric-sub">Classification</span>
                      </div>

                      {/* Risk Level */}
                      <div className="sfi-metric-card" style={{ borderLeft: '3px solid var(--neonC)' }}>
                        <span className="sfi-metric-label">Risk Level</span>
                        <span
                          className="sfi-metric-value"
                          style={{ color: riskLevelColor(flareData.risk_level) }}
                        >
                          {flareData.risk_level || 'LOW'}
                        </span>
                        <span className="sfi-metric-sub">Threat Severity</span>
                      </div>

                      {/* Confidence Score */}
                      <div className="sfi-metric-card" style={{ borderLeft: '3px solid var(--neonA)' }}>
                        <span className="sfi-metric-label">Confidence Score</span>
                        <span className="sfi-metric-value" style={{ color: 'var(--neonC)' }}>
                          {flareData.confidence_score != null ? `${flareData.confidence_score}%` : '—'}
                        </span>
                        <span className="sfi-metric-sub">Model Probability</span>
                      </div>

                      {/* Predicted Log Flux */}
                      <div className="sfi-metric-card" style={{ borderLeft: '3px solid #3b82f6' }}>
                        <span className="sfi-metric-label">Predicted Log Flux</span>
                        <span className="sfi-metric-value">
                          {flareData.predicted_log_flux != null
                            ? Number(flareData.predicted_log_flux).toFixed(2)
                            : '—'}
                        </span>
                        <span className="sfi-metric-sub">W/m² (log10)</span>
                      </div>

                      {/* Real Space Flux */}
                      <div className="sfi-metric-card" style={{ borderLeft: '3px solid #ec4899' }}>
                        <span className="sfi-metric-label">Real Space Flux</span>
                        <span className="sfi-metric-value" style={{ fontSize: 16 }}>
                          {flareData.real_space_flux != null
                            ? Number(flareData.real_space_flux).toExponential(3)
                            : '—'}
                        </span>
                        <span className="sfi-metric-sub">W/m² Irradiance</span>
                      </div>
                    </div>

                    {/* Solar Disk Anomaly Localization Viewer */}
                    <div style={{ marginTop: 10 }}>
                      <SolarDiskViewer
                        anomalyLocalization={flareData.anomaly_localization}
                        riskLevel={flareData.risk_level}
                        flareClass={flareData.flare_class}
                      />
                    </div>
                  </>
                ) : (
                  <div className="sfi-fallback-box">
                    <AlertTriangle size={24} color="var(--risk-med)" />
                    <div>No live solar prediction data available.</div>
                    <button className="sfi-btn" onClick={loadFlarePrediction}>
                      Initiate Scan
                    </button>
                  </div>
                )}
              </section>

              {/* ══════════════════════════════════════════════════════════════════
                  SOURCE 2A: TERRESTRIAL GRID RANKINGS & IMPACT MAP
              ══════════════════════════════════════════════════════════════════ */}
              <section className="sfi-section-card glass neon-border">
                <div className="sfi-section-header">
                  <div className="sfi-section-title-group">
                    <div className="sfi-section-icon" style={{ color: '#35f28c', borderColor: 'rgba(53, 242, 140, 0.3)' }}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <h3 className="sfi-section-heading">2A. Terrestrial Power Grid Risk Rankings & Geo Map</h3>
                      <div className="sfi-section-sub">
                        Target API: GET https://solar-sentinel-v2.onrender.com/api/v1/infrastructure/impact?mode=live (grid_heatmap_triggers)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className={`sfi-status-badge ${
                        infraLoading ? 'loading' : infraError ? 'error' : 'healthy'
                      }`}
                    >
                      {infraLoading ? 'Refreshing…' : infraError ? 'Offline' : `${gridTriggers.length} Regions Ranked`}
                    </span>
                    <button
                      className="sfi-btn"
                      onClick={loadInfrastructureImpact}
                      disabled={infraLoading}
                      title="Refresh infrastructure data"
                    >
                      <RefreshCw size={12} className={infraLoading ? 'sfi-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {infraError && (
                  <div className="sfi-error-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} />
                      <span>{infraError}</span>
                    </div>
                    <button className="sfi-btn" onClick={loadInfrastructureImpact}>
                      Retry Impact API
                    </button>
                  </div>
                )}

                {infraLoading && !infraData ? (
                  <div className="sfi-fallback-box">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--neonC)',
                        animation: 'sfiSpin 0.9s linear infinite',
                      }}
                    />
                    <div>Calculating geomagnetic induced currents on regional grids…</div>
                  </div>
                ) : gridTriggers.length > 0 ? (
                  <div className="sfi-grid-map-layout">
                    {/* Left: Ranked Grid Regions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                          Ranked by Induced Impact Value
                        </span>
                        <button
                          className="sfi-btn"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                          onClick={() => setGridSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                        >
                          <ArrowUpDown size={10} />
                          {gridSortDir === 'desc' ? 'Highest Risk' : 'Lowest Risk'}
                        </button>
                      </div>

                      <div className="sfi-ranked-list-wrap">
                        {gridTriggers.map((t, index) => {
                          const isSelected = selectedGridTrigger?.region === t.region
                          const val = Number(t.value) || 0
                          const pct = Math.min(100, Math.max(5, val * 100))
                          const lvlCls = alertLevelClass(t.alert_level)

                          return (
                            <Motion.div
                              key={t.region || index}
                              className={`sfi-ranked-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedGridTrigger(t)}
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.15 }}
                            >
                              <div className="sfi-ranked-header">
                                <span className="sfi-ranked-name">
                                  #{index + 1} {t.region}
                                </span>
                                <span className={`sfi-alert-pill ${lvlCls}`}>
                                  {t.alert_level || 'GREEN'}
                                </span>
                              </div>

                              <div className="sfi-ranked-meta">
                                <span>
                                  Value: <strong style={{ color: '#fff' }}>{t.value}</strong>
                                </span>
                                <span>
                                  {t.lat != null && t.lng != null
                                    ? `${Number(t.lat).toFixed(2)}°N, ${Number(t.lng).toFixed(2)}°E`
                                    : 'Coordinates unavailable'}
                                </span>
                              </div>

                              <div className="sfi-ranked-bar-wrap">
                                <div
                                  className="sfi-ranked-bar-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background:
                                      lvlCls === 'red'
                                        ? 'var(--risk-high)'
                                        : lvlCls === 'yellow'
                                        ? 'var(--risk-med)'
                                        : 'var(--risk-low)',
                                  }}
                                />
                              </div>
                            </Motion.div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Right: Map with markers at lat, lng */}
                    <div>
                      <GridImpactMap
                        triggers={gridTriggers}
                        selectedTrigger={selectedGridTrigger}
                        onSelect={(t) => setSelectedGridTrigger(t)}
                      />
                      <div
                        style={{
                          marginTop: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          color: 'var(--muted)',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        <span>
                          {selectedGridTrigger
                            ? `Focused: ${selectedGridTrigger.region} (${selectedGridTrigger.lat}° N, ${selectedGridTrigger.lng}° E)`
                            : 'Click any region card or map pin to inspect'}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-low)' }} /> Low
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-med)' }} /> Warning
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-high)' }} /> Critical
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sfi-fallback-box">
                    <AlertTriangle size={24} color="var(--risk-med)" />
                    <div>No grid heatmap triggers returned by the infrastructure API.</div>
                  </div>
                )}
              </section>

              {/* ══════════════════════════════════════════════════════════════════
                  SOURCE 2B: AVIATION ALERTS
              ══════════════════════════════════════════════════════════════════ */}
              <section className="sfi-section-card glass neon-border">
                <div className="sfi-section-header">
                  <div className="sfi-section-title-group">
                    <div className="sfi-section-icon" style={{ color: '#22d3ee', borderColor: 'rgba(34, 211, 238, 0.3)' }}>
                      <Plane size={20} />
                    </div>
                    <div>
                      <h3 className="sfi-section-heading">2B. High-Latitude Aviation Corridor Advisories</h3>
                      <div className="sfi-section-sub">
                        Target API: GET https://solar-sentinel-v2.onrender.com/api/v1/infrastructure/impact?mode=live (aviation_alerts)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['ALL', 'NOMINAL', 'WARNING', 'RE-ROUTED'].map((st) => (
                        <button
                          key={st}
                          className="sfi-btn"
                          style={{
                            padding: '4px 10px',
                            fontSize: 10,
                            background: aviationFilter === st ? 'rgba(34, 211, 238, 0.25)' : undefined,
                            borderColor: aviationFilter === st ? 'var(--neonC)' : undefined,
                          }}
                          onClick={() => setAviationFilter(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: 'relative' }}>
                      <Search
                        size={12}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--muted)',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search route or action…"
                        value={aviationSearch}
                        onChange={(e) => setAviationSearch(e.target.value)}
                        style={{
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#fff',
                          padding: '6px 12px 6px 28px',
                          fontSize: 11,
                          fontFamily: 'var(--mono)',
                          outline: 'none',
                          width: 170,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {aviationAlerts.length > 0 ? (
                  <div className="sfi-aviation-grid">
                    {aviationAlerts.map((a, idx) => {
                      const color = aviationStatusColor(a.status)
                      return (
                        <Motion.div
                          key={a.route_id || idx}
                          className="sfi-aviation-card"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                        >
                          <div className="sfi-aviation-header">
                            <div className="sfi-aviation-route">
                              <Plane size={15} style={{ color }} />
                              <span>{a.route_id}</span>
                            </div>

                            <span
                              className="sfi-alert-pill"
                              style={{
                                color,
                                background: `${color}18`,
                                borderColor: `${color}44`,
                              }}
                            >
                              {a.status || 'UNKNOWN'}
                            </span>
                          </div>

                          <div className="sfi-aviation-action-box">
                            <div className="sfi-aviation-action-label">Recommended Air Traffic Action</div>
                            <div>{a.action || 'No action specified'}</div>
                          </div>
                        </Motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="sfi-fallback-box">
                    <CheckCircle2 size={24} color="var(--risk-low)" />
                    <div>No aviation corridor alerts matching criteria. All routes nominal.</div>
                  </div>
                )}
              </section>

              {/* ══════════════════════════════════════════════════════════════════
                  SOURCE 3: SATELLITE RISK & RECOMMENDATIONS
              ══════════════════════════════════════════════════════════════════ */}
              <section className="sfi-section-card glass neon-border">
                <div className="sfi-section-header">
                  <div className="sfi-section-title-group">
                    <div className="sfi-section-icon" style={{ color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.3)' }}>
                      <Satellite size={20} />
                    </div>
                    <div>
                      <h3 className="sfi-section-heading">3. Orbital Satellite Risk & Shielding Directives</h3>
                      <div className="sfi-section-sub">
                        Target API: GET https://solar-sentinel-1.onrender.com/api/helio-risk (curated_top_10 / all_satellites)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Curated vs All toggle */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="sfi-btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: 10,
                          background: satViewMode === 'curated' ? 'rgba(236, 72, 153, 0.25)' : undefined,
                          borderColor: satViewMode === 'curated' ? '#ec4899' : undefined,
                        }}
                        onClick={() => setSatViewMode('curated')}
                      >
                        Curated Top 10
                      </button>
                      <button
                        className="sfi-btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: 10,
                          background: satViewMode === 'all' ? 'rgba(236, 72, 153, 0.25)' : undefined,
                          borderColor: satViewMode === 'all' ? '#ec4899' : undefined,
                        }}
                        onClick={() => setSatViewMode('all')}
                      >
                        All Satellites ({satData?.all_satellites?.length || '1000'})
                      </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <Search
                        size={12}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--muted)',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search satellite name or action…"
                        value={satSearch}
                        onChange={(e) => setSatSearch(e.target.value)}
                        style={{
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#fff',
                          padding: '6px 12px 6px 28px',
                          fontSize: 11,
                          fontFamily: 'var(--mono)',
                          outline: 'none',
                          width: 180,
                        }}
                      />
                    </div>

                    <button
                      className="sfi-btn"
                      onClick={loadSatelliteRisk}
                      disabled={satLoading}
                      title="Refresh satellite telemetry"
                    >
                      <RefreshCw size={12} className={satLoading ? 'sfi-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {satError && (
                  <div className="sfi-error-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} />
                      <span>{satError}</span>
                    </div>
                    <button className="sfi-btn" onClick={loadSatelliteRisk}>
                      Retry Satellite Risk
                    </button>
                  </div>
                )}

                {satLoading && !satData ? (
                  <div className="sfi-fallback-box">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--neonC)',
                        animation: 'sfiSpin 0.9s linear infinite',
                      }}
                    />
                    <div>Calculating orbital radiation dosage across constellation assets…</div>
                  </div>
                ) : displayedSatellites.length > 0 ? (
                  <div className="sfi-satellites-table-wrap">
                    <table className="sfi-sat-table">
                      <thead>
                        <tr>
                          <th>Asset Name</th>
                          <th>Orbit / Alt</th>
                          <th>Risk Score</th>
                          <th>Status</th>
                          <th>Action Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedSatellites.slice(0, 25).map((sat, i) => {
                          const score = Number(sat.risk_score ?? sat.riskScore) || 0
                          const scoreCol =
                            score >= 75 ? 'var(--risk-high)' : score >= 50 ? 'var(--risk-med)' : 'var(--risk-low)'
                          const statusCol =
                            String(sat.status).toUpperCase() === 'CRITICAL'
                              ? 'var(--risk-high)'
                              : String(sat.status).toUpperCase() === 'ELEVATED'
                              ? 'var(--risk-med)'
                              : 'var(--risk-low)'

                          return (
                            <tr key={sat.id || sat.name || i}>
                              <td style={{ fontWeight: 700, color: '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Satellite size={13} color="var(--neonC)" />
                                  <span>{sat.name}</span>
                                </div>
                              </td>

                              <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                                {sat.orbit || 'LEO'} · {sat.altitudeKm ?? sat.alt ? `${sat.altitudeKm ?? sat.alt} km` : '—'}
                              </td>

                              <td style={{ fontFamily: 'var(--mono)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 800, color: scoreCol, minWidth: 36 }}>
                                    {score.toFixed(1)}
                                  </span>
                                  <div
                                    style={{
                                      width: 60,
                                      height: 5,
                                      borderRadius: 999,
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(100, Math.max(0, score))}%`,
                                        height: '100%',
                                        background: scoreCol,
                                        borderRadius: 999,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span
                                  className="sfi-alert-pill"
                                  style={{
                                    color: statusCol,
                                    background: `${statusCol}18`,
                                    borderColor: `${statusCol}44`,
                                  }}
                                >
                                  {sat.status || 'NOMINAL'}
                                </span>
                              </td>

                              <td>
                                <span className="sfi-sat-rec">
                                  <Shield size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                  {sat.recommendation || 'Standard operations'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {displayedSatellites.length > 25 && (
                      <div
                        style={{
                          padding: '10px 16px',
                          fontSize: 11,
                          color: 'var(--muted)',
                          fontFamily: 'var(--mono)',
                          textAlign: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        Showing top 25 of {displayedSatellites.length} satellites sorted by risk score.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="sfi-fallback-box">
                    <AlertTriangle size={24} color="var(--risk-med)" />
                    <div>No satellite risk records found matching query.</div>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
