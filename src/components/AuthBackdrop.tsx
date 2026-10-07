import { animate } from 'animejs'
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const LoginScene = lazy(() => import('./LoginScene'))

const SKY = 'radial-gradient(ellipse at 70% 12%, #553548 0%, #2c1b25 48%, #1a1115 100%)'
const depth = (px: number) => ({ '--depth': px }) as CSSProperties

// Login / new-password background: three.js sky + Killua (left) and Serena (right) around the card.
export default function AuthBackdrop({ children, flashSignal = 0 }: { children: ReactNode; flashSignal?: number }) {
  const [animated] = useState(() => !prefersReducedMotion())
  const [entranceFlash, setEntranceFlash] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animated) return
    const el = root.current!
    const onPointer = (e: PointerEvent) => {
      el.style.setProperty('--px', String(e.clientX / window.innerWidth - 0.5))
      el.style.setProperty('--py', String(e.clientY / window.innerHeight - 0.5))
    }
    window.addEventListener('pointermove', onPointer)
    const killua = animate(el.querySelector('[data-char="killua"]')!, {
      opacity: 1,
      translateX: { from: '-110%' },
      skewX: { from: -20 },
      filter: { from: 'brightness(3.5)' },
      duration: 700,
      delay: 400,
      ease: 'outExpo',
      onBegin: () => setEntranceFlash((n) => n + 1),
    })
    const serena = animate(el.querySelector('[data-char="usagi"]')!, {
      opacity: 1,
      scale: { from: 0.6 },
      rotate: { from: 10 },
      duration: 1200,
      delay: 800,
      ease: 'outElastic(1, .6)',
    })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      killua.revert()
      serena.revert()
    }
  }, [animated])

  const hidden = animated ? { opacity: 0, filter: 'brightness(1)' } : undefined
  return (
    <div ref={root} className="relative min-h-dvh overflow-hidden" style={{ background: SKY }}>
      {animated && (
        <Suspense fallback={null}>
          <LoginScene flashSignal={flashSignal + entranceFlash} />
        </Suspense>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="parallax absolute -left-[12%] bottom-0 w-[64vw] max-w-[640px] md:left-[1%] md:w-[42vw]" style={depth(36)}>
          <div data-char="killua" style={hidden}>
            <img src="/login/killua.webp" alt="" className="float w-full drop-shadow-[0_0_28px_rgba(124,196,255,0.45)]" />
          </div>
        </div>
        <div className="parallax absolute -right-[6%] bottom-0 h-[39vh] md:right-[5%] md:h-[80vh]" style={depth(20)}>
          <div data-char="usagi" className="h-full" style={hidden}>
            <img src="/login/usagi.webp" alt="" className="float float-late h-full w-auto drop-shadow-[0_0_28px_rgba(227,180,207,0.55)]" />
          </div>
        </div>
      </div>
      <div className="relative z-10 grid min-h-dvh place-items-center p-4 pb-[30vh] md:pb-4">{children}</div>
    </div>
  )
}
