import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Shield, Satellite, Search, Layers, RefreshCw } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import { RiskBar } from '../components/Charts'
import { fetchFullHelioRisk, pickCuratedTop50Satellites } from '../utils/helioApi'
import '../styles/charts.css'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'orbit', label: 'Orbit' },
  { key: 'altitude', label: 'Altitude' },
  { key: 'risk_score', label: 'Risk Score' },
  { key: 'status', label: 'Status' },
  { key: 'recommendation', label: 'Action Recommendation' },
]

function SortHeader({ label, active, dir, onClick }) {
  return (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={onClick}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active ? <span style={{ color: 'var(--neonC)', fontSize: 10 }}>{dir === 'asc' ? '▲' : '▼'}</span> : null}
      </span>
    </th>
  )
}

export default function SatelliteRiskPage() {
  const [satData, setSatData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('risk_score')
  const [dir, setDir] = useState('desc')

  // Requirement 4 filters:
  const [viewMode, setViewMode] = useState('curated') // 'curated' | 'all'
  const [riskFilter, setRiskFilter] = useState('ALL') // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

  const loadData = async (signal) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchFullHelioRisk(signal)
      setSatData(data)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load satellite telemetry.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const ctrl = new AbortController()
    loadData(ctrl.signal)
    return () => ctrl.abort()
  }, [])

  // Process rows according to toggle & risk filters
  const processedRows = useMemo(() => {
    if (!satData) return []
    const sourceList =
      viewMode === 'all'
        ? satData.all_satellites && satData.all_satellites.length > 0
          ? satData.all_satellites
          : satData.curated_top_10 || []
        : pickCuratedTop50Satellites(
            satData.all_satellites && satData.all_satellites.length > 0
              ? satData.all_satellites
              : satData.curated_top_10 || []
          )

    return sourceList.filter((s) => {
      // Risk level filter: All / High / Medium / Low
      if (riskFilter !== 'ALL') {
        const lvl = String(s.level || '').toUpperCase()
        const target = riskFilter.toUpperCase()
        if (target === 'HIGH' && lvl !== 'HIGH') return false
        if (target === 'MEDIUM' && (lvl !== 'MEDIUM' && lvl !== 'NORMAL' && lvl !== 'MED')) return false
        if (target === 'LOW' && lvl !== 'LOW') return false
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const matchesName = String(s.name || '').toLowerCase().includes(q)
        const matchesOrbit = String(s.orbit || '').toLowerCase().includes(q)
        const matchesRec = String(s.recommendation || '').toLowerCase().includes(q)
        const matchesStatus = String(s.status || '').toLowerCase().includes(q)
        if (!matchesName && !matchesOrbit && !matchesRec && !matchesStatus) return false
      }

      return true
    })
  }, [satData, viewMode, riskFilter, searchTerm])

  const sortedRows = useMemo(() => {
    const mul = dir === 'asc' ? 1 : -1
    return [...processedRows].sort((a, b) => {
      let av = a[sortKey]
      let bv = b[sortKey]
      if (sortKey === 'risk_score') {
        av = Number(a.risk_score ?? a.riskScore) || 0
        bv = Number(b.risk_score ?? b.riskScore) || 0
      } else if (sortKey === 'altitude') {
        av = Number(a.altitudeKm ?? a.alt) || 0
        bv = Number(b.altitudeKm ?? b.alt) || 0
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
      return String(av || '').localeCompare(String(bv || '')) * mul
    })
  }, [processedRows, sortKey, dir])

  // Chart data: top 10 from current sorted rows
  const chartSubset = useMemo(() => sortedRows.slice(0, 10), [sortedRows])
  const names = useMemo(() => chartSubset.map((r) => r.name), [chartSubset])
  const scores = useMemo(() => chartSubset.map((r) => Number(r.risk_score ?? r.riskScore) || 0), [chartSubset])

  const onSort = (key) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setDir(key === 'risk_score' ? 'desc' : 'asc')
    }
  }

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar
              title="HelioScar — Satellite Risk & Directives"
              subtitle="Orbital fleet radiation scoring, risk ranking, and operational shielding recommendations"
            />

            <section className="grid">
              <div className="card glass neon-border" style={{ gridColumn: 'span 7' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ margin: 0 }}>Satellite Fleet Risk Table</h3>

                  {/* Curated Top 10 vs All Satellites Toggle */}
                  <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.25)', padding: 3, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      className="btn"
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        background: viewMode === 'curated' ? 'rgba(34,211,238,0.25)' : 'transparent',
                        borderColor: viewMode === 'curated' ? 'var(--neonC)' : 'transparent',
                        color: viewMode === 'curated' ? '#fff' : 'var(--muted)',
                      }}
                      onClick={() => setViewMode('curated')}
                    >
                      Curated Top 50
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        background: viewMode === 'all' ? 'rgba(34,211,238,0.25)' : 'transparent',
                        borderColor: viewMode === 'all' ? 'var(--neonC)' : 'transparent',
                        color: viewMode === 'all' ? '#fff' : 'var(--muted)',
                      }}
                      onClick={() => setViewMode('all')}
                    >
                      All Satellites ({satData?.all_satellites?.length || '1000'})
                    </button>
                  </div>
                </div>

                {/* Filters: Risk Level Filter + Search */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Risk Filters: All / High / Medium / Low */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                      <button
                        key={lvl}
                        className="btn"
                        style={{
                          padding: '5px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'var(--mono)',
                          background: riskFilter === lvl ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                          borderColor:
                            riskFilter === lvl
                              ? lvl === 'HIGH'
                                ? 'var(--risk-high)'
                                : lvl === 'MEDIUM'
                                ? 'var(--risk-med)'
                                : lvl === 'LOW'
                                ? 'var(--risk-low)'
                                : 'var(--neonC)'
                              : 'rgba(255,255,255,0.1)',
                          color:
                            lvl === 'HIGH'
                              ? 'var(--risk-high)'
                              : lvl === 'MEDIUM'
                              ? 'var(--risk-med)'
                              : lvl === 'LOW'
                              ? 'var(--risk-low)'
                              : '#fff',
                        }}
                        onClick={() => setRiskFilter(lvl)}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>

                  <div style={{ flex: 1, minWidth: 160 }}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search satellite name or directive…"
                      aria-label="Search satellites"
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.3)',
                        color: 'var(--text)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        borderRadius: 10,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    className="btn"
                    onClick={() => loadData()}
                    disabled={isLoading}
                    title="Reload satellite risk from API"
                    style={{ padding: '6px 10px', fontSize: 11 }}
                  >
                    <RefreshCw size={12} className={isLoading ? 'sfi-spin' : ''} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="subtle" style={{ fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                    Loading live satellite risk from GET /api/helio-risk…
                  </div>
                ) : error ? (
                  <div className="subtle" style={{ fontSize: 13, color: 'var(--risk-high)', padding: '16px 0' }}>
                    {error}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          {columns.map((c) => (
                            <SortHeader
                              key={c.key}
                              label={c.label}
                              active={sortKey === c.key}
                              dir={dir}
                              onClick={() => onSort(c.key)}
                            />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.slice(0, 50).map((s, idx) => {
                          const score = Number(s.risk_score ?? s.riskScore) || 0
                          const altText = s.altitudeKm ?? s.alt ? `${s.altitudeKm ?? s.alt} km` : '—'

                          return (
                            <Motion.tr
                              key={s.id || s.name || idx}
                              className="rowHover"
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <td style={{ fontWeight: 650, color: '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Satellite size={12} color="var(--neonC)" />
                                  <span>{s.name}</span>
                                </div>
                              </td>
                              <td className="subtle">{s.orbit || 'LEO'}</td>
                              <td className="subtle" style={{ fontFamily: 'var(--mono)' }}>
                                {altText}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>
                                <span
                                  style={{
                                    color:
                                      score >= 70
                                        ? 'var(--risk-high)'
                                        : score >= 50
                                        ? 'var(--risk-med)'
                                        : 'var(--risk-low)',
                                  }}
                                >
                                  {score.toFixed(1)}
                                </span>
                              </td>
                              <td>
                                <RiskBadge level={s.level} />
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11,
                                    fontFamily: 'var(--mono)',
                                    color: 'rgba(255,255,255,0.85)',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                  }}
                                >
                                  <Shield size={10} color="var(--neonC)" />
                                  {s.recommendation || 'Standard monitoring'}
                                </span>
                              </td>
                            </Motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {sortedRows.length > 50 && (
                      <div
                        className="subtle"
                        style={{
                          fontSize: 11,
                          marginTop: 10,
                          textAlign: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                          paddingTop: 8,
                        }}
                      >
                        Showing 50 of {sortedRows.length} matching satellites.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card glass neon-border" style={{ gridColumn: 'span 5' }}>
                <h3 style={{ marginBottom: 6 }}>Satellite Risk Profiles</h3>
                <div className="subtle" style={{ fontSize: 11, marginBottom: 12 }}>
                  Visualizing top assets matching active filters ({viewMode === 'all' ? 'All Satellites' : 'Curated Top 10'})
                </div>

                <div className="chartWrap">
                  <RiskBar names={names} scores={scores} />
                </div>

                <div className="subtle" style={{ fontSize: 12, marginTop: 12 }}>
                  Scores ≥ 70 reflect critical vulnerability (red), 50–69 elevated (yellow), &lt; 50 nominal (green).
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
