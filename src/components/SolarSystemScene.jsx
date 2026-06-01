import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import Sun from './Sun'
import EarthWithSatellites from './EarthWithSatellites'

function SolarSystemScene({ className, satellites = null }) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 5, 14], fov: 42, near: 0.1, far: 300 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#02050d']} />

        <Suspense fallback={null}>
          <Stars
            radius={120}
            depth={75}
            count={4200}
            factor={3.4}
            fade
            speed={0.35}
            saturation={0}
          />

          <ambientLight intensity={0.14} color="#9fb4ff" />

          <Sun radius={4} />
          <EarthWithSatellites satellites={satellites} />

          <EffectComposer multisampling={4}>
            <Bloom
              intensity={1.4}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.6}
            />
          </EffectComposer>
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={30}
          target={[0, 0, 0]}
          dampingFactor={0.08}
          rotateSpeed={0.56}
          zoomSpeed={0.82}
          panSpeed={0.78}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </div>
  )
}

export default SolarSystemScene
