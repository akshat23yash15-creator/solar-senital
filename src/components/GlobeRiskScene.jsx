import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import dayTexture from '../assets/day.jpg.jpeg'
import nightTexture from '../assets/night.png'
import cloudsTexture from '../assets/clouds.png'
import normalTexture from '../assets/normal.jpg.jpeg'
import specularTexture from '../assets/specular.jpg.jpeg'

const EARTH_RADIUS = 5.25

export default function GlobeRiskScene({ className }) {
  const mountRef = useRef(null)
  const rafRef = useRef(0)

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

    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 128, 128), earthMaterial)
    scene.add(earth)

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.01, 96, 96),
      cloudMaterial
    )
    scene.add(clouds)

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

    const gridGroup = new THREE.Group()
    scene.add(gridGroup)

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

    const createLongitudeGeometry = (lon) => {
      const r = EARTH_RADIUS + 0.055
      const segments = 240
      const points = []
      const theta = lon * (Math.PI / 180)

      for (let lat = -90; lat <= 90; lat += 180 / segments) {
        const phi = (90 - lat) * (Math.PI / 180)
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

    const latitudeRings = [-60, -30, 30, 60].map((lat) => createLatitudeGeometry(lat))
    const longitudeArcs = [30, 60, 90, 120, 150, 210, 240, 270, 300, 330].map((lon) =>
      createLongitudeGeometry(lon)
    )
    const equator = createLatitudeGeometry(0)
    const primeMeridian = createLongitudeGeometry(0)

    latitudeRings.forEach((geometry) => {
      const line = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({ color: '#7fb4ff', transparent: true, opacity: 0.24 })
      )
      gridGroup.add(line)
    })

    longitudeArcs.forEach((geometry) => {
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: '#7fb4ff', transparent: true, opacity: 0.2 })
      )
      gridGroup.add(line)
    })

    const equatorLine = new THREE.LineLoop(
      equator,
      new THREE.LineBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.75 })
    )
    gridGroup.add(equatorLine)

    const meridianLine = new THREE.Line(
      primeMeridian,
      new THREE.LineBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.6 })
    )
    gridGroup.add(meridianLine)

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

      earth.rotation.y += delta * 0.03
      clouds.rotation.y += delta * 0.038
      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()

      earth.geometry.dispose()
      earthMaterial.dispose()
      clouds.geometry.dispose()
      cloudMaterial.dispose()
      atmosphere.geometry.dispose()
      atmosphereMaterial.dispose()

      latitudeRings.forEach((g) => g.dispose())
      longitudeArcs.forEach((g) => g.dispose())
      equator.dispose()
      primeMeridian.dispose()
      gridGroup.children.forEach((child) => child.material?.dispose?.())

      dayMap.dispose()
      normalMap.dispose()
      specularMap.dispose()
      nightMap.dispose()
      cloudMap.dispose()

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }} />
}