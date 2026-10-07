import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import type { Achievement } from '../lib/types'
import Icon from './Icon'
import RarityBadge from './RarityBadge'

const SPARKS = 14

export default function Celebration({ achievements, onClose }: { achievements: Achievement[]; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = box.current!
    const angle = (i: number) => (i / SPARKS) * Math.PI * 2
    const anims = [
      animate(el.querySelectorAll('[data-medal]'), { rotateY: { from: 180 }, scale: { from: 0.3 }, duration: 950, delay: stagger(160), ease: 'outBack(1.4)' }),
      animate(el.querySelectorAll('[data-spark]'), {
        translateX: (_: unknown, i = 0) => Math.cos(angle(i)) * 120,
        translateY: (_: unknown, i = 0) => Math.sin(angle(i)) * 120,
        scale: [{ to: 1.4 }, { to: 0 }],
        opacity: [{ to: 1 }, { to: 0 }],
        duration: 1000,
        delay: stagger(18, { start: 150 }),
        ease: 'outExpo',
      }),
    ]
    return () => anims.forEach((a) => a.revert())
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="celebration-title" className="fixed inset-0 z-50 flex overflow-y-auto bg-night/70 p-4 backdrop-blur-sm">
      <div ref={box} className="card relative m-auto w-full max-w-sm space-y-5 overflow-hidden p-6 text-center">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-28">
          {Array.from({ length: SPARKS }, (_, i) => <span key={i} data-spark className="spark" />)}
        </div>
        <h2 id="celebration-title" className="text-2xl font-bold text-brand">Conquista desbloqueada!</h2>
        <ul className="space-y-5">
          {achievements.map((a) => (
            <li key={a.id} className={`medal-${a.rarity} space-y-2 [perspective:600px]`}>
              <div data-medal className="medallion mx-auto size-24">
                <Icon name={a.icon} className="size-11" />
              </div>
              <p className="font-display text-xl font-semibold">{a.name}</p>
              <RarityBadge rarity={a.rarity} />
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary min-h-12 w-full" onClick={onClose} autoFocus>Continuar</button>
      </div>
    </div>
  )
}
