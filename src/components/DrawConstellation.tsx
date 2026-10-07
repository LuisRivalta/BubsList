import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { hopDelays, hopSequence } from '../lib/constellation'

const FINALE_MS = 1100

function glowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,214,236,0.85)')
  g.addColorStop(1, 'rgba(227,180,207,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// The draw as a constellation: one star per candidate; a glow hops between them drawing lines,
// slows down, lands on the winner and flies at the camera in a burst of light.
export default function DrawConstellation({ titles, winner, onDone }: { titles: string[]; winner: number; onDone: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('')
  const finish = useRef(onDone)
  finish.current = onDone

  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      finish.current() // no WebGL: straight to the result
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.z = 10
    const texture = glowTexture()
    const group = new THREE.Group()
    scene.add(group)

    const points = titles.map(() => {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.6 + Math.sqrt(Math.random()) * 3.4
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 1.25, (Math.random() - 0.5) * 1.5)
    })
    const starGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const starMaterial = new THREE.PointsMaterial({
      size: 0.55, map: texture, color: '#f5d6e6', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    group.add(new THREE.Points(starGeometry, starMaterial))

    const sequence = hopSequence(points.length, winner)
    const hopAt: number[] = []
    hopDelays(sequence.length).reduce((t, d) => (hopAt.push(t + d), t + d), 0)
    const landed = hopAt[hopAt.length - 1]
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(sequence.map((s) => points[s]))
    lineGeometry.setDrawRange(0, 0)
    const lineMaterial = new THREE.LineBasicMaterial({ color: '#e3b4cf', transparent: true, opacity: 0.6 })
    group.add(new THREE.Line(lineGeometry, lineMaterial))

    const glowMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const glow = new THREE.Sprite(glowMaterial)
    glow.scale.setScalar(0)
    group.add(glow)

    const resize = () => {
      const w = el.clientWidth || window.innerWidth
      const h = el.clientHeight || window.innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      group.scale.setScalar(Math.min(1, camera.aspect / 0.75)) // keep the disc inside portrait screens
    }
    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    let hop = -1
    let ended = false
    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const t = now - start
      group.rotation.z = t * 0.00006
      starMaterial.opacity = 0.75 + 0.15 * Math.sin(t * 0.004)
      let current = hop
      while (current + 1 < sequence.length && t >= hopAt[current + 1]) current++
      if (current !== hop) {
        hop = current
        lineGeometry.setDrawRange(0, hop + 1)
        setLabel(titles[sequence[hop]])
      }
      if (hop >= 0) {
        const p = points[sequence[hop]]
        if (t < landed + 250) {
          glow.position.copy(p)
          glow.scale.setScalar(1.1 * (1 + 0.25 * Math.sin(t * 0.02)))
        } else {
          // Finale: the others fade, the winner flies at the camera and bursts into light.
          const k = Math.min(1, (t - landed - 250) / FINALE_MS)
          starMaterial.opacity *= 1 - k
          lineMaterial.opacity = 0.6 * (1 - k)
          glow.position.set(p.x * (1 - k), p.y * (1 - k), p.z + k * 8.5)
          glow.scale.setScalar(1.1 + k * k * 9)
          if (k >= 1 && !ended) {
            ended = true
            finish.current()
          }
        }
      }
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      for (const d of [starGeometry, starMaterial, lineGeometry, lineMaterial, glowMaterial, texture]) d.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="absolute inset-0">
      <div ref={host} aria-hidden className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
      <p className="absolute inset-x-4 bottom-[22%] text-center font-display text-2xl font-bold text-white drop-shadow-[0_2px_12px_rgb(227_180_207/0.6)]">
        {label}
      </p>
    </div>
  )
}
