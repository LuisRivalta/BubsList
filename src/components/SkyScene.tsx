import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { makeBolt, type Point } from '../lib/bolt'

// Night sky: pink sparkles (Sailor Moon), a glowing crescent moon and Killua's Godspeed lightning. Used by the login and behind every page hero.

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d')!, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function drawDot(ctx: CanvasRenderingContext2D, s: number) {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
}

function drawMoon(ctx: CanvasRenderingContext2D, s: number) {
  const r = s * 0.24
  const halo = ctx.createRadialGradient(s / 2, s / 2, r * 0.8, s / 2, s / 2, s / 2)
  halo.addColorStop(0, 'rgba(255,205,230,0.45)')
  halo.addColorStop(1, 'rgba(255,205,230,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, s, s)
  // The crescent is cut on its own canvas so the cut doesn't punch a hole in the halo.
  const moon = document.createElement('canvas')
  moon.width = moon.height = s
  const m = moon.getContext('2d')!
  m.shadowColor = 'rgba(255,240,210,0.9)'
  m.shadowBlur = s * 0.05
  m.fillStyle = '#fff4dc'
  m.beginPath()
  m.arc(s / 2, s / 2, r, 0, Math.PI * 2)
  m.fill()
  m.globalCompositeOperation = 'destination-out'
  m.beginPath()
  m.arc(s / 2 + r * 0.42, s / 2 - r * 0.22, r * 0.9, 0, Math.PI * 2)
  m.fill()
  ctx.drawImage(moon, 0, 0)
}

export default function SkyScene({ flashSignal = 0, boltEvery = [2600, 6200] }: { flashSignal?: number; boltEvery?: [number, number] }) {
  const host = useRef<HTMLDivElement>(null)
  const flash = useRef<() => void>(() => {})
  const every = useRef(boltEvery)

  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return // no WebGL: the CSS gradient behind stays on its own
    }
    const mobile = window.innerWidth < 768
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.z = 10
    const disposables: { dispose(): void }[] = []
    const keep = <T extends { dispose(): void }>(d: T) => (disposables.push(d), d)

    const dot = keep(canvasTexture(64, drawDot))
    const makeSparkles = (count: number, spread: number, size: number, opacity: number) => {
      const positions = new Float32Array(count * 3)
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (Math.random() - 0.5) * spread * 1.6
        positions[i + 1] = (Math.random() - 0.5) * spread
        positions[i + 2] = (Math.random() - 0.5) * 10
      }
      const geometry = keep(new THREE.BufferGeometry())
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = keep(
        new THREE.PointsMaterial({ color: '#e3b4cf', size, map: dot, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }),
      )
      const points = new THREE.Points(geometry, material)
      scene.add(points)
      return points
    }
    const dust = makeSparkles(mobile ? 260 : 600, 20, 0.16, 0.8)
    const stars = makeSparkles(mobile ? 25 : 50, 18, 0.45, 0.9)

    const moonMaterial = keep(new THREE.SpriteMaterial({ map: keep(canvasTexture(512, drawMoon)), transparent: true, depthWrite: false }))
    const moon = new THREE.Sprite(moonMaterial)
    scene.add(moon)
    let moonSize = 6

    type Bolt = { group: THREE.Group; born: number; life: number }
    let bolts: Bolt[] = []
    const lineMaterials: LineMaterial[] = []
    let halfW = 1
    let halfH = 1

    function boltLine(points: Point[], z: number, color: string, width: number, opacity: number) {
      const geometry = new LineGeometry()
      geometry.setPositions(points.flatMap(([x, y]) => [x, y, z]))
      const material = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })
      material.resolution.set(el.clientWidth, el.clientHeight)
      lineMaterials.push(material)
      const line = new Line2(geometry, material)
      line.userData.base = opacity
      return line
    }

    function spawnBolt(big = false) {
      const fromLeft = Math.random() < 0.5
      const start: Point = big ? [-halfW * 0.9, halfH * 0.9] : [fromLeft ? -halfW * 1.1 : (Math.random() - 0.5) * halfW, halfH * 1.1]
      const end: Point = big ? [halfW * 0.9, -halfH * 0.9] : [fromLeft ? halfW * (0.2 + Math.random() * 0.8) : (Math.random() - 0.5) * halfW * 2, -halfH * (0.2 + Math.random() * 0.9)]
      const z = big ? 2 : -2 - Math.random() * 3
      const path = makeBolt(start, end, big ? 7 : 6, 0.2)
      const group = new THREE.Group()
      group.add(boltLine(path, z, '#7cc4ff', big ? 14 : 9, 0.35), boltLine(path, z, '#f2fbff', big ? 3.5 : 2, 1))
      for (let b = 0; b < (big ? 3 : 2); b++) {
        const from = path[2 + Math.floor(Math.random() * (path.length - 4))]
        const to: Point = [from[0] + (Math.random() - 0.3) * halfW * 0.6, from[1] - Math.random() * halfH * 0.6]
        group.add(boltLine(makeBolt(from, to, 4, 0.3), z, '#bfe6ff', 1.5, 0.7))
      }
      scene.add(group)
      bolts.push({ group, born: performance.now(), life: big ? 650 : 420 })
    }

    function removeBolt(b: Bolt) {
      scene.remove(b.group)
      for (const line of b.group.children as Line2[]) {
        line.geometry.dispose()
        line.material.dispose()
        lineMaterials.splice(lineMaterials.indexOf(line.material), 1)
      }
    }

    let moonBoost = 0
    flash.current = () => {
      spawnBolt(true)
      moonBoost = 1
    }

    function resize() {
      if (!el.clientWidth || !el.clientHeight) return
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z
      halfW = halfH * camera.aspect
      const portrait = camera.aspect < 0.9
      moonSize = portrait ? 4.2 : 6
      moon.position.set(portrait ? halfW * 0.45 : halfW * 0.58, halfH * (portrait ? 0.72 : 0.6), -1)
      for (const m of lineMaterials) m.resolution.set(w, h)
    }
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(el)
    window.addEventListener('resize', resize)

    const pointer = { x: 0, y: 0 }
    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth - 0.5
      pointer.y = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointer)

    const clock = new THREE.Clock()
    let nextBolt = performance.now() + every.current[0] * 0.7
    let raf = 0
    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      const t = clock.getElapsedTime()
      dust.rotation.y = t * 0.015
      dust.position.y = Math.sin(t * 0.25) * 0.25
      stars.rotation.y = -t * 0.01
      ;(stars.material as THREE.PointsMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 1.7)
      camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04
      camera.position.y += (-pointer.y * 0.8 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)
      moonBoost *= 0.94
      const scale = moonSize * (1 + 0.025 * Math.sin(t * 1.1) + moonBoost * 0.3)
      moon.scale.set(scale, scale, 1)
      moonMaterial.rotation = Math.sin(t * 0.3) * 0.06
      if (now > nextBolt) {
        spawnBolt()
        nextBolt = now + every.current[0] + Math.random() * (every.current[1] - every.current[0])
      }
      bolts = bolts.filter((b) => {
        const age = (now - b.born) / b.life
        if (age >= 1) {
          removeBolt(b)
          return false
        }
        const flicker = age < 0.35 ? (Math.random() > 0.35 ? 1 : 0.3) : 1 - age
        for (const line of b.group.children as Line2[]) line.material.opacity = line.userData.base * flicker
        return true
      })
      renderer.render(scene, camera)
    }
    let visible = true
    const schedule = () => {
      cancelAnimationFrame(raf)
      if (visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      schedule()
    }) : null
    io?.observe(el)
    schedule()
    document.addEventListener('visibilitychange', schedule)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', schedule)
      ro?.disconnect()
      io?.disconnect()
      bolts.forEach(removeBolt)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    if (flashSignal) flash.current()
  }, [flashSignal])

  return <div ref={host} aria-hidden className="absolute inset-0 [&>canvas]:block [&>canvas]:size-full" />
}
