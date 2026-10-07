import { animate, stagger } from 'animejs'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '../lib/motion'

// Cascades the children in on mount; reverts afterwards so hover transforms and fixed overlays keep working.
export default function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const items = Array.from(ref.current?.children ?? []) as HTMLElement[]
    if (prefersReducedMotion() || items.length === 0) return
    const a = animate(items, { opacity: { from: 0 }, translateY: { from: 14 }, delay: stagger(45), duration: 420, ease: 'outQuad', onComplete: (self) => self.revert() })
    return () => {
      a.revert()
    }
  }, [])
  return <div ref={ref} className={className}>{children}</div>
}
