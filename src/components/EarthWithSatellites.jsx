import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import dayTexture from '../assets/day.jpg.jpeg'
import nightTexture from '../assets/night.png'
import cloudsTexture from '../assets/clouds.png'
import normalTexture from '../assets/normal.jpg.jpeg'
import specularTexture from '../assets/specular.jpg.jpeg'
import { fetchHelioRiskSatellites, pickHelioModelSatellites } from '../utils/helioApi'
import { riskColorThree } from '../utils/risk'

const EARTH_RADIUS = 0.78
const EARTH_ORBIT_RADIUS = 11.5
const EARTH_ORBIT_SPEED = 0.08
const EARTH_ROTATION_SPEED = 0.46

function stableHash(input) {
  let hash = 0
  const str = String(input)
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function toOrbitType(text) {
  if (!text) return 'LEO'
  const orbit = String(text).toUpperCase()
  if (orbit.includes('GEO')) return 'GEO'
  if (orbit.includes('MEO')) return 'MEO'
  if (orbit.includes('HEO')) return 'HEO'
  return 'LEO'
}

function orbitAltitudeFromType(type) {
  switch (type) {
    case 'GEO':
      return 2.2
    case 'MEO':
      return 1.5
    case 'HEO':
      return 1.9
    default:
      return 1.0
  }
}

function deriveLatLon(satellite, index) {
  if (Number.isFinite(satellite.latitude) && Number.isFinite(satellite.longitude)) {
    return { lat: satellite.latitude, lon: satellite.longitude }
  }

  const h = stableHash(`${satellite.id}-${satellite.name}-${index}`)
  return {
    lat: ((h % 14000) / 100) - 70,
    lon: (((h >> 3) % 36000) / 100) - 180,
  }
}

function orbitPoints(radius, segments = 180) {
  const pts = []
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
  }
  return pts
}

function SatelliteOrbitLine({ radius, rotation, color }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(orbitPoints(radius)), [radius])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  return (
    <lineLoop rotation={rotation}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.24}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineLoop>
  )
}

function EarthWithSatellites({ satellites = null }) {
  const orbitPivotRef = useRef(null)
  const earthAxisRef = useRef(null)
  const cloudRef = useRef(null)
  const satMeshRefs = useRef([])

  const [apiSatellites, setApiSatellites] = useState([])
  const [dayMap, nightMap, cloudMap, normalMap, specularMap] = useTexture([
    dayTexture,
    nightTexture,
    cloudsTexture,
    normalTexture,
    specularTexture,
  ])

  useEffect(() => {
    if (Array.isArray(satellites)) return undefined

    let cancelled = false

    const run = async () => {
      try {
        const data = await fetchHelioRiskSatellites()
        if (!cancelled) {
          setApiSatellites(pickHelioModelSatellites(data))
        }
      } catch {
        if (!cancelled) {
          setApiSatellites([])
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [satellites])

  const activeSatellites = Array.isArray(satellites) ? satellites : apiSatellites

  const preparedSatellites = useMemo(() => {
    return activeSatellites.map((satellite, index) => {
      const level = satellite.level === 'normal' ? 'medium' : satellite.level || 'low'
      const orbitType = toOrbitType(satellite.orbit)
      const altitudeFromApi = Number.isFinite(satellite.altitudeKm)
        ? Math.max(0.85, Math.min(2.6, satellite.altitudeKm / 14000))
        : orbitAltitudeFromType(orbitType)
      const { lat, lon } = deriveLatLon(satellite, index)

      return {
        ...satellite,
        level,
        color: riskColorThree(level),
        orbitRadius: EARTH_RADIUS + altitudeFromApi * 0.32,
        speed: 0.2 + (stableHash(satellite.id) % 11) * 0.018,
        phase: (stableHash(satellite.name) % 628) / 100,
        rotation: new THREE.Euler(
          ((stableHash(`${satellite.id}-inc`) % 70) - 35) * (Math.PI / 180),
          (lon * Math.PI) / 180,
          (lat * Math.PI) / 180
        ),
      }
    })
  }, [activeSatellites])

  useFrame(({ clock }, delta) => {
    if (orbitPivotRef.current) {
      orbitPivotRef.current.rotation.y += delta * EARTH_ORBIT_SPEED
      orbitPivotRef.current.rotation.x = 0.12
    }

    if (earthAxisRef.current) {
      earthAxisRef.current.rotation.z = THREE.MathUtils.degToRad(23.4)
      earthAxisRef.current.rotation.y += delta * EARTH_ROTATION_SPEED
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.5
    }

    const t = clock.getElapsedTime()

    for (let i = 0; i < preparedSatellites.length; i += 1) {
      const sat = preparedSatellites[i]
      const mesh = satMeshRefs.current[i]
      if (!mesh) continue

      const angle = t * sat.speed + sat.phase
      const position = new THREE.Vector3(
        Math.cos(angle) * sat.orbitRadius,
        0,
        Math.sin(angle) * sat.orbitRadius
      )

      position.applyEuler(sat.rotation)
      mesh.position.copy(position)

      if (sat.level === 'high' || sat.level === 'medium') {
        const pulseRate = sat.level === 'high' ? 6.8 : 4.8
        const pulse = 0.5 + 0.5 * Math.sin(t * pulseRate)
        const minScale = sat.level === 'high' ? 1.0 : 0.92
        const maxScale = sat.level === 'high' ? 1.5 : 1.26
        const scalar = minScale + (maxScale - minScale) * pulse
        mesh.scale.setScalar(scalar)
      } else {
        mesh.scale.setScalar(1)
      }
    }
  })

  return (
    <group ref={orbitPivotRef}>
      <group position={[EARTH_ORBIT_RADIUS, 0, 0]}>
        <group ref={earthAxisRef}>
          <mesh>
            <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
            <meshPhongMaterial
              color="#eef7ff"
              map={dayMap}
              normalMap={normalMap}
              specularMap={specularMap}
              emissiveMap={nightMap}
              emissive="#0f172a"
              emissiveIntensity={0.2}
              normalScale={new THREE.Vector2(0.62, 0.62)}
              shininess={35}
            />
          </mesh>

          <mesh ref={cloudRef}>
            <sphereGeometry args={[EARTH_RADIUS * 1.012, 72, 72]} />
            <meshPhongMaterial
              map={cloudMap}
              alphaMap={cloudMap}
              color="#dbeafe"
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
        </group>

        <group>
          {preparedSatellites.map((sat) => (
            <SatelliteOrbitLine
              key={`${sat.id}-orbit`}
              radius={sat.orbitRadius}
              rotation={[sat.rotation.x, sat.rotation.y, sat.rotation.z]}
              color={sat.color}
            />
          ))}

          {preparedSatellites.map((sat, index) => (
            <mesh
              key={sat.id}
              ref={(node) => {
                satMeshRefs.current[index] = node
              }}
            >
              <sphereGeometry args={[0.048, 16, 16]} />
              <meshPhongMaterial
                color={sat.color}
                emissive={sat.color}
                emissiveIntensity={sat.level === 'high' ? 1.4 : sat.level === 'medium' ? 1 : 0.7}
                shininess={80}
                transparent
                opacity={0.95}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

export default EarthWithSatellites
