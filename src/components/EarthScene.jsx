import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import dayTexture from '../assets/day.jpg.jpeg'
import nightTexture from '../assets/night.png'
import cloudsTexture from '../assets/clouds.png'
import normalTexture from '../assets/normal.jpg.jpeg'
import specularTexture from '../assets/specular.jpg.jpeg'

const EARTH_RADIUS = 3.65

export default function EarthScene({ className }) {
  const mountRef = useRef(null)
  const rafRef = useRef(0)

  // Mount 3D Earth Scene once — rock solid, clean, pure rotating blue globe
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || window.innerWidth || 800
    const height = mount.clientHeight || window.innerHeight || 600

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x05060f, 15, 50)

    const camera = new THREE.PerspectiveCamera(40, width / Math.max(1, height), 0.1, 1000)
    camera.position.set(0.4, 0.1, 9.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    // Orbit Controls with smooth auto-rotation & gentle manual interaction
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.rotateSpeed = 0.5
    controls.enableZoom = false
    controls.enablePan = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4
    controls.target.set(0, 0, 0)

    // Rich Space Lighting
    scene.add(new THREE.AmbientLight(0x7090ff, 0.85))
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x050a1f, 0.95))

    const sun = new THREE.DirectionalLight(0xfff8e7, 2.4)
    sun.position.set(12, 7, 9)
    scene.add(sun)

    const fill = new THREE.DirectionalLight(0x00f0ff, 1.1)
    fill.position.set(-10, -2, -6)
    scene.add(fill)

    // Local Textures (instant, reliable, no external dependencies)
    const loader = new THREE.TextureLoader()
    const dayMap = loader.load(dayTexture)
    const normalMap = loader.load(normalTexture)
    const specularMap = loader.load(specularTexture)
    const nightMap = loader.load(nightTexture)
    const cloudMap = loader.load(cloudsTexture)

    dayMap.colorSpace = THREE.SRGBColorSpace
    nightMap.colorSpace = THREE.SRGBColorSpace

    const earthGroup = new THREE.Group()
    scene.add(earthGroup)

    // Vibrant Blue Earth Sphere
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96)
    const earthMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#38bdf8'),
      map: dayMap,
      normalMap,
      specularMap,
      emissiveMap: nightMap,
      emissive: new THREE.Color('#0ea5e9'),
      emissiveIntensity: 0.55,
      specular: new THREE.Color('#bae6fd'),
      shininess: 32,
      transparent: false,
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earthGroup.add(earth)

    // Rotating Translucent Clouds
    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.018, 64, 64)
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudMap,
      alphaMap: cloudMap,
      color: new THREE.Color('#e0f2fe'),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
    const clouds = new THREE.Mesh(cloudGeo, cloudMat)
    earthGroup.add(clouds)

    // Glowing Neon Blue Atmosphere
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.13, 64, 64)
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
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
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.75, 1.0, 0.42 * intensity);
        }
      `,
    })
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
    scene.add(atmosphere)

    // Responsive Resize Observer
    const resize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w > 0 && h > 0) {
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    const clock = new THREE.Clock()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      earthGroup.rotation.y += delta * 0.05
      clouds.rotation.y += delta * 0.065

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  )
}