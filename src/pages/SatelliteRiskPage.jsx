import { useEffect, useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import { RiskBar } from '../components/Charts'
import { fetchHelioRiskSatellites, pickHelioModelSatellites, searchHelioSatellites } from '../utils/helioApi'
import '../styles/charts.css'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'orbit', label: 'Orbit' },
  { key: 'ageYears', label: 'Age' },
  { key: 'riskScore', label: 'Risk Score' },
  { key: 'status', label: 'Status' },
]

function SortHeader({ label, active, dir, onClick }) {
  return (
    <th style={{ cursor: 'pointer' }} onClick={onClick}>
      {label}
      {active ? <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.65)' }}>{dir === 'asc' ? '▲' : '▼'}</span> : null}
    </th>
  )
}

export default function SatelliteRiskPage() {
  const [allRows, setAllRows] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('riskScore')
  const [dir, setDir] = useState('desc')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      setError('')
      try {
        const q = searchTerm.trim()
        const data = q ? await searchHelioSatellites(q) : await fetchHelioRiskSatellites()
        const sourceRows = q ? data : pickHelioModelSatellites(data)
        if (!cancelled) setAllRows(sourceRows)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load satellites.')
          setAllRows([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    const timer = setTimeout(run, 260)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchTerm])

  const rows = useMemo(() => {
    const mul = dir === 'asc' ? 1 : -1
    return [...allRows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
      return String(av).localeCompare(String(bv)) * mul
    })
  }, [allRows, sortKey, dir])

  const names = useMemo(() => rows.map((r) => r.name), [rows])
  const scores = useMemo(() => rows.map((r) => r.riskScore), [rows])

  const onSort = (key) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setDir(key === 'riskScore' ? 'desc' : 'asc')
    }
  }

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar title="HelioScar — Satellite Risk" subtitle="Sortable risk table with Chart.js risk profile" />

            <section className="grid">
              <div className="card glass neon-border" style={{ gridColumn: 'span 7' }}>
                <h3>Satellite Table</h3>
                <div style={{ marginBottom: 10 }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search satellite name..."
                    aria-label="Search satellites"
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      outline: 'none',
                    }}
                  />
                </div>
                {isLoading ? (
                  <div className="subtle" style={{ fontSize: 13 }}>Loading satellites...</div>
                ) : error ? (
                  <div className="subtle" style={{ fontSize: 13, color: 'var(--risk-high)' }}>{error}</div>
                ) : (
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
                      {rows.map((s) => (
                        <Motion.tr
                          key={s.id}
                          className="rowHover"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <td style={{ fontWeight: 650 }}>{s.name}</td>
                          <td className="subtle">{s.orbit}</td>
                          <td className="subtle">{s.ageYears}y</td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{s.riskScore}</td>
                          <td>
                            <RiskBadge level={s.level} />
                          </td>
                        </Motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                  Default model view shows 3 high + 3 normal + 4 low risk satellites.
                </div>
              </div>

              <div className="card glass neon-border" style={{ gridColumn: 'span 5' }}>
                <h3>Risk Scores</h3>
                <div className="chartWrap">
                  <RiskBar names={names} scores={scores} />
                </div>
                <div className="subtle" style={{ fontSize: 12, marginTop: 10 }}>
                  Scores above 70 are high risk (red), 50–69 medium (yellow), below 50 low (green).
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
