import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

function Sun({ radius = 4 }) {
  const sunRef = useRef(null)
  const coronaRef = useRef(null)

  const sunTextureUrl = useMemo(
    () => new URL('../assets/main 1.jpg', import.meta.url).toString(),
    []
  )
  const coronaTextureUrl = useMemo(
    () => new URL('../assets/glow 1.jpg', import.meta.url).toString(),
    []
  )

  const sunTexture = useTexture(sunTextureUrl)
  const coronaTexture = useTexture(coronaTextureUrl)

  useEffect(() => {
    sunTexture.wrapS = THREE.RepeatWrapping
    sunTexture.wrapT = THREE.RepeatWrapping
    sunTexture.repeat.set(1, 1)
    sunTexture.offset.set(0, 0)
    sunTexture.colorSpace = THREE.SRGBColorSpace
    sunTexture.anisotropy = 8

    coronaTexture.wrapS = THREE.ClampToEdgeWrapping
    coronaTexture.wrapT = THREE.ClampToEdgeWrapping
    coronaTexture.colorSpace = THREE.SRGBColorSpace
  }, [sunTexture, coronaTexture])

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

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()

    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.04
    }

    if (coronaRef.current) {
      coronaRef.current.rotation.y -= delta * 0.01
      coronaRef.current.material.opacity = 0.24 + Math.sin(t * 0.6) * 0.03
    }
  })

  return (
    <group>
      <pointLight color="#ffbb66" intensity={100} distance={300} decay={2} />

      <mesh ref={sunRef} material={sunMaterial}>
        <sphereGeometry args={[radius, 128, 128]} />
      </mesh>

      <mesh ref={coronaRef} material={coronaMaterial} scale={1.12}>
        <sphereGeometry args={[radius, 96, 96]} />
      </mesh>
    </group>
  )
}

export default Sun
