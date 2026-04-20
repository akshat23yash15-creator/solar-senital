import { useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import RiskBadge from '../components/RiskBadge'
import { satellites } from '../utils/dummyData'
import { riskLevelFromScore } from '../utils/risk'
import { RiskBar } from '../components/Charts'
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
  const [sortKey, setSortKey] = useState('riskScore')
  const [dir, setDir] = useState('desc')

  const rows = useMemo(() => {
    const mapped = satellites.map((s) => ({ ...s, level: riskLevelFromScore(s.riskScore) }))
    const mul = dir === 'asc' ? 1 : -1
    return mapped.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
      return String(av).localeCompare(String(bv)) * mul
    })
  }, [sortKey, dir])

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
                        key={s.name}
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
                <div className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                  Click headers to sort • Hover rows for motion cues
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
