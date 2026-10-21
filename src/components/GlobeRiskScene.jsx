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

export default function GlobeRiskScene({ className, satellites = [], onSelectSatellite }) {
  const mountRef = useRef(null)
  const rafRef = useRef(0)
  const clickableRef = useRef([])

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

    // Satellite Markers & Illustrative Orbit Rings
    const satGroup = new THREE.Group()
    earthGroup.add(satGroup)

    const satGeometry = new THREE.SphereGeometry(0.08, 16, 16)
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
        emissiveIntensity: satellite.level === 'high' ? 2.0 : satellite.level === 'medium' ? 1.4 : 0.9,
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
      return { satellite, mesh, orbit }
    })

    clickableRef.current = satObjects.map((s) => s.mesh)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const onPointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)

      const hits = raycaster.intersectObjects(clickableRef.current)
      if (hits.length > 0) {
        onSelectSatellite?.(hits[0].object.userData.satellite)
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)

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

      satObjects.forEach((obj) => {
        if (obj.satellite.level === 'high' || obj.satellite.level === 'medium') {
          const pulse = 0.5 + 0.5 * Math.sin(elapsed * (obj.satellite.level === 'high' ? 7 : 4))
          const s = (obj.satellite.level === 'high' ? 1.0 : 0.9) + pulse * 0.45
          obj.mesh.scale.setScalar(s)
          obj.mesh.material.opacity = 0.7 + 0.3 * pulse
          obj.mesh.material.emissiveIntensity = obj.satellite.level === 'high' ? 1.5 + pulse : 1.1 + pulse * 0.5
        }
      })

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      ro.disconnect()
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [preparedSatellites, onSelectSatellite])

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%' }} />
}