import { motion as Motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import SolarSystemScene from '../components/SolarSystemScene'
import AIPredictionPanel from '../components/AIPredictionPanel'
import { useSolarPrediction } from '../context/SolarPredictionContext'

export default function SolarSystemPage() {
  const { prediction } = useSolarPrediction()

  // Build the prediction state object that Sun / SolarSystemScene consume
  const predictionState = prediction
    ? { riskLevel: prediction.riskLevel, anomaly: prediction.anomaly }
    : null

  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main" style={{ position: 'relative' }}>
            <Topbar
              title="Solar System View"
              subtitle="Sun-centered mini system — AI prediction drives real-time Sun visuals"
            />

            {/* Two-column layout: Scene (wide) + AI Panel (right) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: 14,
                height: 'calc(100svh - 170px)',
              }}
            >
              {/* 3D Scene */}
              <div
                className="card glass neon-border"
                style={{ padding: 0, overflow: 'hidden', position: 'relative', height: '100%' }}
              >
                <SolarSystemScene
                  className="globeRiskCanvas"
                  predictionState={predictionState}
                />

                <div
                  className="subtle"
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 12,
                    fontSize: 12,
                    pointerEvents: 'none',
                  }}
                >
                  Drag to rotate · Scroll to zoom · Right drag to pan
                </div>

                {/* Risk overlay badge when prediction is active */}
                {predictionState && (
                  <Motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: 12,
                      pointerEvents: 'none',
                    }}
                  >
                    <span
                      className={`ai-risk-badge ${
                        predictionState.riskLevel === 'HIGH'
                          ? 'HIGH'
                          : predictionState.riskLevel === 'MEDIUM'
                          ? 'MED'
                          : 'LOW'
                      }`}
                      style={{ fontSize: 11 }}
                    >
                      <span className="ai-risk-dot" />
                      {predictionState.riskLevel} RISK
                    </span>
                  </Motion.div>
                )}
              </div>

              {/* AI Prediction Panel */}
              <Motion.div
                className="card glass neon-border"
                style={{ padding: 16, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 22 }}
              >
                <AIPredictionPanel />
              </Motion.div>
            </div>

            {/* Responsive fallback: stack below scene on narrow screens */}
            <style>{`
              @media (max-width: 1100px) {
                .solar-system-layout {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
