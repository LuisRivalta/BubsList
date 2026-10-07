import Lenis from 'lenis'
import { prefersReducedMotion } from './motion'

export function startSmoothScroll(): Lenis | null {
  if (prefersReducedMotion()) return null
  return new Lenis({ autoRaf: true })
}
