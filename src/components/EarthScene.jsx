import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { satellites } from '../utils/dummyData'
import { riskLevelFromScore, riskColorThree } from '../utils/risk'

export default function EarthScene({ className }) {
  const mountRef = useRef(null)
  const rafRef = useRef(0)

  const satMeta = useMemo(() => {
    return satellites.map((s, idx) => {
      const level = riskLevelFromScore(s.riskScore)
      return {
        ...s,
        level,
        color: new THREE.Color(riskColorThree(level)),
        // Scaled orbit radius relative to the larger Earth
        radius: 3.2 + (idx % 3) * 0.25,
        speed: 0.1 + (idx % 4) * 0.03,
        inc: (idx * 25 * Math.PI) / 180,
        phase: idx * 1.5,
      }
    })
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    // Matches the deep background color of your Home.jsx
    scene.fog = new THREE.Fog(0x05060f, 12, 45)

  const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000)
  // Slightly closer so the Home globe looks bigger.
  camera.position.set(0, 0, 9.6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    // --- NEON THEME LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0x4050ff, 0.6) // Blueish tint
    scene.add(ambientLight)

    const cyanLight = new THREE.DirectionalLight(0x00f2ff, 1.5)
    cyanLight.position.set(5, 3, 5)
    scene.add(cyanLight)

    // NOTE: keep textures local/procedural if you want a fully offline demo.
    const loader = new THREE.TextureLoader()
    const dayTex = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg')
    const nightTex = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png')

    const earthGroup = new THREE.Group()
    scene.add(earthGroup)

    // --- BIGGER + SLIGHTLY TRANSPARENT GLOBE ---
  const earthRadius = 3.55
    const earthGeo = new THREE.SphereGeometry(earthRadius, 96, 96)
    const earthMat = new THREE.MeshStandardMaterial({
      map: dayTex,
      emissiveMap: nightTex,
      emissive: new THREE.Color(0x00aaff), // Cyan neon glow for cities
  emissiveIntensity: 2.2,
      metalness: 0.18,
      roughness: 0.75,
      color: new THREE.Color(0x050a1a), // Base color matches UI theme
      transparent: true,
      opacity: 0.92,
    })

    const earth = new THREE.Mesh(earthGeo, earthMat)
    earthGroup.add(earth)

    // --- NEON ATMOSPHERE ---
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.035, 96, 96)
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f2ff) },
        coeficient: { value: 0.15 },
        power: { value: 3.5 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float coeficient;
        uniform float power;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDirection = normalize(-vPosition);
          float intensity = pow(coeficient + dot(vNormal, viewDirection), power);
          gl_FragColor = vec4(glowColor, intensity);
        }
      `
    })
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
    earthGroup.add(atmosphere)

  // --- SATELLITES & ORBIT LINES ---
    const satGroup = new THREE.Group()
    earthGroup.add(satGroup)
    
    const satGeo = new THREE.SphereGeometry(0.06, 16, 16)
    
  const activeSats = satMeta.map((s) => {
      // Create Satellite Point
      const mesh = new THREE.Mesh(
        satGeo,
        new THREE.MeshBasicMaterial({
          color: s.color,
          transparent: true,
          opacity: 0.95,
        })
      )
      satGroup.add(mesh)

      // Create Orbit Ring (this is the path we will animate the dot on)
      const curve = new THREE.EllipseCurve(0, 0, s.radius, s.radius)
      const points = curve.getPoints(256)
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      )
      const orbitMat = new THREE.LineBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat)

      // IMPORTANT: use the same transform for BOTH the line and the satellite position.
      // We'll move the satellite along the orbit in orbit-local space and then apply
      // the orbitLine's matrixWorld to place it correctly.
      orbitLine.rotation.x = s.inc
      orbitLine.rotation.z = s.phase
      orbitLine.updateMatrixWorld(true)

      earthGroup.add(orbitLine)

      return { ...s, mesh, orbitLine, orbitPoints: points }
    })

    // Home requirement: show only the globe (no orbits/dots).
    // Keep the code for reuse, but hide groups here.
    satGroup.visible = false
    activeSats.forEach((s) => {
      if (s.orbitLine) s.orbitLine.visible = false
    })

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

  earthGroup.rotation.y = t * 0.085 // Faster rotation for Home
      earthGroup.rotation.x = Math.sin(t * 0.07) * 0.02
      
  // Satellites are hidden on Home; skip their updates.
  // activeSats.forEach((s) => {
        // Move the dot ON the drawn orbit path
  // })

      renderer.render(scene, camera)
    }

    const clock = new THREE.Clock()
    animate()

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [satMeta])

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100vh' }} />
}