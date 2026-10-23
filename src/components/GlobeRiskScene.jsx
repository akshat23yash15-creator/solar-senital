import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import dayTexture from '../assets/day.jpg.jpeg'
import nightTexture from '../assets/night.png'
import cloudsTexture from '../assets/clouds.png'
import normalTexture from '../assets/normal.jpg.jpeg'
import specularTexture from '../assets/specular.jpg.jpeg'
import { riskColorThree } from '../utils/risk'

const EARTH_RADIUS = 5.25

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
      return 1.65
    case 'MEO':
      return 1.1
    case 'HEO':
      return 1.45
    default:
      return 0.6
  }
}

function createOrbitGeometry(radius, segments = 240) {
  const points = []
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

export default function GlobeRiskScene({
  className,
  satellites = [],
  selectedSatellite = null,
  onSelectSatellite,
}) {
  const mountRef = useRef(null)
  const rafRef = useRef(0)
  const satGroupRef = useRef(null)
  const selectionReticleRef = useRef(null)
  const reticleRingsRef = useRef({ inner: null, outer: null })
  const clickableRef = useRef([])
  const satObjectsRef = useRef([])
  const downPosRef = useRef({ x: 0, y: 0 })

  // Keep callback and selection refs up to date without triggering scene recreation
  const onSelectRef = useRef(onSelectSatellite)
  useEffect(() => {
    onSelectRef.current = onSelectSatellite
  }, [onSelectSatellite])

  const selectedSatRef = useRef(selectedSatellite)
  useEffect(() => {
    selectedSatRef.current = selectedSatellite
  }, [selectedSatellite])

  // Only satellites with valid coordinates from the API
  const preparedSatellites = useMemo(() => {
    return (satellites || [])
      .filter((s) => {
        const lat = s.latitude ?? s.lat
        const lon = s.longitude ?? s.lng ?? s.lon
        return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
      })
      .map((satellite) => {
        const lat = Number(satellite.latitude ?? satellite.lat)
        const lon = Number(satellite.longitude ?? satellite.lng ?? satellite.lon)
        const level = satellite.level === 'normal' ? 'medium' : satellite.level || 'low'
        const orbitType = toOrbitType(satellite.orbit)
        const altVal = Number(satellite.altitudeKm ?? satellite.alt)
        const baseAltitude = Number.isFinite(altVal)
          ? Math.max(0.35, Math.min(2.1, altVal / 18000))
          : orbitAltitudeFromType(orbitType)

        return {
          ...satellite,
          level,
          color: riskColorThree(level),
          altitude: baseAltitude,
          lat,
          lon,
        }
      })
  }, [satellites])

  // 1. Initialize Scene, Camera, Renderer, Earth & Controls ONCE on mount
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000)
    camera.position.set(0.25, 0.12, 8.7)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 1)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.62
    controls.zoomSpeed = 0.82
    controls.enablePan = false
    controls.minDistance = 6.5
    controls.maxDistance = 16
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.22
    controls.target.set(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xf5f9ff, 0.5))
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.72))

    const sun = new THREE.DirectionalLight(0xfff6d6, 1.55)
    sun.position.set(12, 8, 8)
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0x9ec5ff, 0.5)
    fill.position.set(-10, -2, -6)
    scene.add(fill)

    const front = new THREE.PointLight(0x93c5fd, 0.35, 50)
    front.position.set(0, 0, 10)
    scene.add(front)

    const loader = new THREE.TextureLoader()
    const dayMap = loader.load(dayTexture)
    const normalMap = loader.load(normalTexture)
    const specularMap = loader.load(specularTexture)
    const nightMap = loader.load(nightTexture)
    const cloudMap = loader.load(cloudsTexture)

    dayMap.colorSpace = THREE.SRGBColorSpace
    nightMap.colorSpace = THREE.SRGBColorSpace

    const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
    dayMap.anisotropy = anisotropy
    normalMap.anisotropy = anisotropy
    specularMap.anisotropy = anisotropy
    nightMap.anisotropy = anisotropy
    cloudMap.anisotropy = anisotropy

    const earthMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#eef7ff'),
      map: dayMap,
      normalMap,
      specularMap,
      emissiveMap: nightMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      emissive: new THREE.Color('#0f172a'),
      emissiveIntensity: 0.22,
      specular: new THREE.Color('#b7d6ff'),
      shininess: 35,
      transparent: false,
    })

    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudMap,
      alphaMap: cloudMap,
      color: new THREE.Color('#dbeafe'),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    })

    const earthGroup = new THREE.Group()
    scene.add(earthGroup)

    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 128, 128), earthMaterial)
    earthGroup.add(earth)

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.01, 96, 96),
      cloudMaterial
    )
    earthGroup.add(clouds)

    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(
            0.36 + 0.08 * intensity,
            0.56 + 0.10 * intensity,
            0.92 + 0.06 * intensity,
            0.20 * intensity
          );
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.13, 64, 64),
      atmosphereMaterial
    )
    scene.add(atmosphere)

    // Lat/Lon coordinate grid lines
    const gridGroup = new THREE.Group()
    earthGroup.add(gridGroup)

    const createLatitudeGeometry = (lat) => {
      const r = EARTH_RADIUS + 0.055
      const segments = 240
      const points = []
      const phi = (90 - lat) * (Math.PI / 180)

      for (let lon = 0; lon < 360; lon += 360 / segments) {
        const theta = lon * (Math.PI / 180)
        points.push(
          new THREE.Vector3(
            -(r * Math.sin(phi) * Math.cos(theta)),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
          )
        )
      }
      return new THREE.BufferGeometry().setFromPoints(points)
    }

    const latitudeRings = [-60, -30, 0, 30, 60].map((lat) => createLatitudeGeometry(lat))
    latitudeRings.forEach((geometry) => {
      const line = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({ color: '#7fb4ff', transparent: true, opacity: 0.22 })
      )
      gridGroup.add(line)
    })

    // Dedicated Group for Satellites (updated dynamically without resetting Earth)
    const satGroup = new THREE.Group()
    earthGroup.add(satGroup)
    satGroupRef.current = satGroup

    // 3D Targeting Reticle for Selected Satellite
    const reticleGroup = new THREE.Group()
    reticleGroup.visible = false

    const innerRingGeo = new THREE.RingGeometry(0.16, 0.20, 32)
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat)
    reticleGroup.add(innerRing)

    const outerRingGeo = new THREE.RingGeometry(0.26, 0.29, 32)
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat)
    reticleGroup.add(outerRing)

    earthGroup.add(reticleGroup)
    selectionReticleRef.current = reticleGroup
    reticleRingsRef.current = { inner: innerRing, outer: outerRing }

    // Click Detection (Differentiates between rotation drag and satellite click)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const onPointerDown = (event) => {
      downPosRef.current = { x: event.clientX, y: event.clientY }
    }

    const onPointerUp = (event) => {
      const dx = event.clientX - downPosRef.current.x
      const dy = event.clientY - downPosRef.current.y
      if (Math.hypot(dx, dy) > 6) return // Dragged/rotated, not a click

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const hits = raycaster.intersectObjects(clickableRef.current)
      if (hits.length > 0) {
        const sat = hits[0].object.userData?.satellite
        if (sat) {
          onSelectRef.current?.(sat)
        }
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()

    const clock = new THREE.Clock()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      earthGroup.rotation.y += delta * 0.03
      clouds.rotation.y += delta * 0.038

      const currentSel = selectedSatRef.current
      let activeTarget = null

      satObjectsRef.current.forEach((obj) => {
        const isSelected =
          currentSel &&
          (currentSel.id === obj.satellite.id || currentSel.name === obj.satellite.name)

        if (isSelected) {
          activeTarget = obj
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 8)
          obj.mesh.scale.setScalar(1.5 + pulse * 0.4)
          obj.mesh.material.emissive.setHex(0x00f0ff)
          obj.mesh.material.emissiveIntensity = 3.0 + pulse * 2.0
          obj.mesh.material.opacity = 1.0
        } else if (obj.satellite.level === 'high' || obj.satellite.level === 'medium') {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * (obj.satellite.level === 'high' ? 7 : 4))
          const s = (obj.satellite.level === 'high' ? 1.0 : 0.9) + pulse * 0.45
          obj.mesh.scale.setScalar(s)
          obj.mesh.material.opacity = 0.7 + 0.3 * pulse
          obj.mesh.material.emissive.set(obj.satellite.color)
          obj.mesh.material.emissiveIntensity =
            obj.satellite.level === 'high' ? 1.5 + pulse : 1.1 + pulse * 0.5
        } else {
          obj.mesh.scale.setScalar(0.9)
          obj.mesh.material.opacity = 0.95
          obj.mesh.material.emissive.set(obj.satellite.color)
          obj.mesh.material.emissiveIntensity = 0.9
        }
      })

      // Update targeting reticle orientation and position over active target
      if (activeTarget && selectionReticleRef.current) {
        selectionReticleRef.current.visible = true
        selectionReticleRef.current.position.copy(activeTarget.mesh.position)
        selectionReticleRef.current.lookAt(camera.position)
        if (reticleRingsRef.current.inner) {
          reticleRingsRef.current.inner.rotation.z = elapsed * 1.5
        }
        if (reticleRingsRef.current.outer) {
          reticleRingsRef.current.outer.rotation.z = -elapsed * 0.8
        }
      } else if (selectionReticleRef.current) {
        selectionReticleRef.current.visible = false
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      ro.disconnect()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, []) // Empty dependency array: Mounts once and NEVER tears down the Earth model!

  // 2. Dynamically sync satellite meshes inside satGroup whenever filtered list changes
  useEffect(() => {
    const satGroup = satGroupRef.current
    if (!satGroup) return

    // Clean up previous satellites without touching Earth, textures, or renderer
    while (satGroup.children.length > 0) {
      const child = satGroup.children[0]
      satGroup.remove(child)
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
        else child.material.dispose()
      }
    }

    const satGeometry = new THREE.SphereGeometry(0.08, 16, 16)
    const hitGeometry = new THREE.SphereGeometry(0.22, 8, 8) // Generous invisible raycast hit box
    const hitMaterial = new THREE.MeshBasicMaterial({ visible: false })

    const satObjects = preparedSatellites.map((satellite) => {
      const orbitRadius = EARTH_RADIUS + satellite.altitude
      const orbitGeometry = createOrbitGeometry(orbitRadius)
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: satellite.color,
        transparent: true,
        opacity: satellite.level === 'high' ? 0.45 : satellite.level === 'medium' ? 0.3 : 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial)
      orbit.rotation.x = (satellite.lat * Math.PI) / 180
      orbit.rotation.y = (satellite.lon * Math.PI) / 180
      satGroup.add(orbit)

      const satMaterial = new THREE.MeshPhongMaterial({
        color: satellite.color,
        emissive: new THREE.Color(satellite.color),
        emissiveIntensity:
          satellite.level === 'high' ? 2.0 : satellite.level === 'medium' ? 1.4 : 0.9,
        shininess: 90,
        transparent: true,
        opacity: 0.95,
      })
      const mesh = new THREE.Mesh(satGeometry, satMaterial)
      mesh.userData.satellite = satellite

      // Position satellite precisely on the sphere at its real lat/lon & altitude
      const phi = (90 - satellite.lat) * (Math.PI / 180)
      const theta = (satellite.lon + 180) * (Math.PI / 180)
      const r = orbitRadius
      const x = -(r * Math.sin(phi) * Math.cos(theta))
      const y = r * Math.cos(phi)
      const z = r * Math.sin(phi) * Math.sin(theta)
      mesh.position.set(x, y, z)
      satGroup.add(mesh)

      // Invisible larger hit box mesh for seamless, easy clicking
      const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial)
      hitMesh.position.set(x, y, z)
      hitMesh.userData.satellite = satellite
      satGroup.add(hitMesh)

      return { satellite, mesh, hitMesh, orbit }
    })

    satObjectsRef.current = satObjects
    clickableRef.current = satObjects.map((s) => s.hitMesh)
  }, [preparedSatellites])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />

      {/* Floating Tactical Telemetry HUD Card on Globe */}
      {selectedSatellite && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 10,
            background: 'rgba(5, 8, 22, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 240, 255, 0.35)',
            borderRadius: 12,
            padding: '12px 16px',
            maxWidth: 320,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 240, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background:
                    (selectedSatellite.risk_score ?? selectedSatellite.riskScore) >= 70
                      ? '#ff3b3b'
                      : (selectedSatellite.risk_score ?? selectedSatellite.riskScore) >= 40
                      ? '#ffbf1f'
                      : '#35f28c',
                  boxShadow: '0 0 8px currentColor',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 750, color: '#ffffff', fontFamily: 'var(--mono)' }}>
                {selectedSatellite.name}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectRef.current?.(null)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
                lineHeight: 1,
              }}
              title="Deselect Satellite"
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11 }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase' }}>Orbit</span>
              <div style={{ color: 'var(--neonC)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                {selectedSatellite.orbit || 'LEO'}
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase' }}>Altitude</span>
              <div style={{ color: '#ffffff', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                {selectedSatellite.altitudeKm ?? selectedSatellite.alt
                  ? `${selectedSatellite.altitudeKm ?? selectedSatellite.alt} km`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase' }}>Velocity</span>
              <div style={{ color: '#ffffff', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                {selectedSatellite.velocityKms ? `${selectedSatellite.velocityKms} km/s` : '7.6 km/s'}
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: 9, textTransform: 'uppercase' }}>Risk Index</span>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  color:
                    (selectedSatellite.risk_score ?? selectedSatellite.riskScore) >= 70
                      ? '#ff3b3b'
                      : (selectedSatellite.risk_score ?? selectedSatellite.riskScore) >= 40
                      ? '#ffbf1f'
                      : '#35f28c',
                }}
              >
                {Number(selectedSatellite.risk_score ?? selectedSatellite.riskScore ?? 0).toFixed(1)} / 100
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 10,
              color: '#cbd5e1',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Status:</span>
            <span style={{ color: 'var(--neonC)', fontFamily: 'var(--mono)' }}>
              {selectedSatellite.recommendation || 'LOCKED & NOMINAL'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}