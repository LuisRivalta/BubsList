import { animate } from 'animejs'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

// The span's text is owned by the effect (not React children) so the animation can write to it freely.
export default function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current!
    if (prefersReducedMotion() || value === 0) {
      el.textContent = String(value)
      return
    }
    const counter = { n: 0 }
    el.textContent = '0'
    const a = animate(counter, { n: value, duration: 900, ease: 'outExpo', onUpdate: () => (el.textContent = String(Math.round(counter.n))) })
    return () => {
      a.pause()
      el.textContent = String(value)
    }
  }, [value])
  return <span ref={ref} className={className} />
}
