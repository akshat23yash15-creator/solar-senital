import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { KpBar, RiskPie, SolarWindLine } from '../components/Charts'
import { kpSeries, riskDistribution, solarWindSeries } from '../utils/dummyData'
import '../styles/charts.css'

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main">
            <Topbar title="Analytics" subtitle="Chart.js telemetry panels with smooth transitions" />

            <section className="grid">
              <Motion.div
                className="card glass neon-border"
                style={{ gridColumn: 'span 7' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3>Solar wind speed</h3>
                <div className="chartWrap">
                  <SolarWindLine labels={solarWindSeries.labels} values={solarWindSeries.values} />
                </div>
              </Motion.div>

              <Motion.div
                className="card glass neon-border"
                style={{ gridColumn: 'span 5' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <h3>Risk distribution</h3>
                <div className="chartWrap">
                  <RiskPie labels={riskDistribution.labels} values={riskDistribution.values} />
                </div>
              </Motion.div>

              <Motion.div
                className="card glass neon-border"
                style={{ gridColumn: 'span 12' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3>Kp Index trend</h3>
                <div className="chartWrap">
                  <KpBar labels={kpSeries.labels} values={kpSeries.values} />
                </div>
              </Motion.div>
            </section>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
