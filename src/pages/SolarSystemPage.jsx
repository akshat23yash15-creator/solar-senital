import PageTransition from '../components/PageTransition'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import SolarSystemScene from '../components/SolarSystemScene'

export default function SolarSystemPage() {
  return (
    <PageTransition>
      <div className="container" style={{ padding: '18px 0 34px' }}>
        <div className="split">
          <Sidebar />

          <main className="main" style={{ position: 'relative' }}>
            <Topbar
              title="Solar System View"
              subtitle="Sun-centered mini system with Earth orbit, axial rotation, and risk satellites"
            />

            <div
              className="card glass neon-border"
              style={{
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                height: 'calc(100svh - 170px)',
              }}
            >
              <SolarSystemScene className="globeRiskCanvas" />

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
                Drag to rotate • Scroll to zoom • Right drag to pan
              </div>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
