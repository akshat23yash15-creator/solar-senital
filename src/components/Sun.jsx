import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Sun.jsx
 * Primary Three.js Sun visualization.
 * Accepts optional `predictionState` prop to drive risk-based visual effects.
 *
 * predictionState shape:
 * {
 *   riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
 *   anomaly: { xPercent: number, yPercent: number, regionName: string }
 * }
 */
function Sun({ radius = 4, predictionState = null }) {
  const sunRef    = useRef(null)
  const coronaRef = useRef(null)
  const hotspotRef = useRef(null)
  const hotspotGlowRef = useRef(null)
  const pulsePhaseRef = useRef(0)

  const sunTextureUrl = useMemo(
    () => new URL('../assets/main 1.jpg', import.meta.url).toString(),
    []
  )
  const coronaTextureUrl = useMemo(
    () => new URL('../assets/glow 1.jpg', import.meta.url).toString(),
    []
  )

  const sunTexture    = useTexture(sunTextureUrl)
  const coronaTexture = useTexture(coronaTextureUrl)

  useEffect(() => {
    sunTexture.wrapS    = THREE.RepeatWrapping
    sunTexture.wrapT    = THREE.RepeatWrapping
    sunTexture.repeat.set(1, 1)
    sunTexture.offset.set(0, 0)
    sunTexture.colorSpace   = THREE.SRGBColorSpace
    sunTexture.anisotropy   = 8

    coronaTexture.wrapS    = THREE.ClampToEdgeWrapping
    coronaTexture.wrapT    = THREE.ClampToEdgeWrapping
    coronaTexture.colorSpace = THREE.SRGBColorSpace
  }, [sunTexture, coronaTexture])

  // ─── Derive visual parameters from prediction state ───────────────────────
  const visualState = useMemo(() => {
    const risk = predictionState?.riskLevel ?? 'LOW'

    if (risk === 'HIGH') {
      return {
        emissiveColor: new THREE.Color('#ff2200'),
        emissiveIntensity: 6.5,
        coronaColor: new THREE.Color('#ff5500'),
        coronaBaseOpacity: 0.42,
        coronaPulseAmp: 0.12,
        coronaPulseSpeed: 2.2,
        rotationSpeed: 0.055,
        pointLightColor: '#ff4400',
        pointLightIntensity: 180,
        showHotspot: true,
      }
    }
    if (risk === 'MEDIUM') {
      return {
        emissiveColor: new THREE.Color('#ff8800'),
        emissiveIntensity: 3.8,
        coronaColor: new THREE.Color('#ffaa44'),
        coronaBaseOpacity: 0.30,
        coronaPulseAmp: 0.05,
        coronaPulseSpeed: 1.0,
        rotationSpeed: 0.046,
        pointLightColor: '#ffaa33',
        pointLightIntensity: 115,
        showHotspot: false,
      }
    }
    // LOW (default)
    return {
      emissiveColor: new THREE.Color('#ff6600'),
      emissiveIntensity: 3.0,
      coronaColor: new THREE.Color('#ffb566'),
      coronaBaseOpacity: 0.24,
      coronaPulseAmp: 0.03,
      coronaPulseSpeed: 0.6,
      rotationSpeed: 0.04,
      pointLightColor: '#ffbb66',
      pointLightIntensity: 100,
      showHotspot: false,
    }
  }, [predictionState])

  // ─── Hotspot 3D position (sphere surface mapping) ─────────────────────────
  const hotspotPosition = useMemo(() => {
    const anomaly = predictionState?.anomaly
    if (!anomaly || anomaly.xPercent === 0 && anomaly.yPercent === 0) return null

    const xPercent = anomaly.xPercent
    const yPercent = anomaly.yPercent
    const r = radius + 0.08 // slightly above surface

    const theta = (xPercent / 100) * Math.PI * 2
    const phi   = (yPercent / 100) * Math.PI

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    )
  }, [predictionState, radius])

  // ─── Sun material (mutable emissive) ─────────────────────────────────────
  const sunMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: sunTexture,
        emissiveMap: sunTexture,
        emissive: new THREE.Color('#ff6600'),
        emissiveIntensity: 3,
        roughness: 1,
        metalness: 0,
      }),
    [sunTexture]
  )

  const coronaMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: coronaTexture,
        color: new THREE.Color('#ffb566'),
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [coronaTexture]
  )

  // Hotspot — red emissive sphere
  const hotspotMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff1a00'),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  // Hotspot glow halo
  const hotspotGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff3300'),
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    []
  )

  // ─── Sync visual params to materials each frame ────────────────────────────
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    pulsePhaseRef.current = t

    const vs = visualState

    // Sun rotation
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * vs.rotationSpeed

      // Sync emissive to current visual state each frame so transitions animate
      const mat = sunRef.current.material
      mat.emissive.lerp(vs.emissiveColor, delta * 1.5)
      mat.emissiveIntensity += (vs.emissiveIntensity - mat.emissiveIntensity) * delta * 1.5
    }

    // Corona pulse
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= delta * 0.01
      const targetOpacity =
        vs.coronaBaseOpacity + Math.sin(t * vs.coronaPulseSpeed) * vs.coronaPulseAmp
      coronaRef.current.material.opacity += (targetOpacity - coronaRef.current.material.opacity) * delta * 3
      coronaRef.current.material.color.lerp(vs.coronaColor, delta * 1.2)
    }

    // Hotspot pulsing animation
    const showHotspot = vs.showHotspot && hotspotPosition !== null
    if (hotspotRef.current) {
      hotspotRef.current.visible = showHotspot
      if (showHotspot) {
        const pulse = 0.75 + Math.sin(t * 4.5) * 0.25
        hotspotRef.current.scale.setScalar(pulse)
        hotspotRef.current.material.opacity = 0.85 + Math.sin(t * 5) * 0.15
      }
    }
    if (hotspotGlowRef.current) {
      hotspotGlowRef.current.visible = showHotspot
      if (showHotspot) {
        const glowPulse = 1.6 + Math.sin(t * 3.0) * 0.4
        hotspotGlowRef.current.scale.setScalar(glowPulse)
        hotspotGlowRef.current.material.opacity = 0.2 + Math.sin(t * 3.0) * 0.1
      }
    }
  })

  const hotspotPos = hotspotPosition ?? new THREE.Vector3(0, radius + 0.08, 0)

  return (
    <group>
      {/* Dynamic point light driven by risk level */}
      <pointLight
        color={visualState.pointLightColor}
        intensity={visualState.pointLightIntensity}
        distance={300}
        decay={2}
      />

      {/* Sun body */}
      <mesh ref={sunRef} material={sunMaterial}>
        <sphereGeometry args={[radius, 128, 128]} />
      </mesh>

      {/* Corona */}
      <mesh ref={coronaRef} material={coronaMaterial} scale={1.12}>
        <sphereGeometry args={[radius, 96, 96]} />
      </mesh>

      {/* ── 3D Hotspot Marker — attaches to sun group, rotates with it ── */}
      {/* Outer glow halo */}
      <mesh
        ref={hotspotGlowRef}
        material={hotspotGlowMaterial}
        position={hotspotPos}
        visible={false}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>

      {/* Core marker sphere */}
      <mesh
        ref={hotspotRef}
        material={hotspotMaterial}
        position={hotspotPos}
        visible={false}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
      </mesh>
    </group>
  )
}

export default Sun
