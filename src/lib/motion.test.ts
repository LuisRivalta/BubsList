import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeBolt } from './bolt'
import { prefersReducedMotion } from './motion'
import { startSmoothScroll } from './smoothScroll'

const media = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))

afterEach(() => vi.unstubAllGlobals())

describe('prefersReducedMotion', () => {
  it('is on when the system asks for reduced motion', () => {
    media(true)
    expect(prefersReducedMotion()).toBe(true)
  })
  it('is off otherwise', () => {
    media(false)
    expect(prefersReducedMotion()).toBe(false)
  })
  it('is on when the environment cannot tell (no matchMedia)', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(true)
  })
})

describe('startSmoothScroll', () => {
  it('does nothing when motion is reduced', () => {
    media(true)
    expect(startSmoothScroll()).toBeNull()
  })
  it('starts Lenis otherwise', () => {
    media(false)
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    const lenis = startSmoothScroll()
    expect(lenis).not.toBeNull()
    lenis?.destroy()
  })
})

describe('makeBolt', () => {
  it('zigzags from start to end with 2^depth segments', () => {
    const points = makeBolt([-1, 0], [1, 0], 4, 0.3, () => 0.9)
    expect(points).toHaveLength(17)
    expect(points[0]).toEqual([-1, 0])
    expect(points[16]).toEqual([1, 0])
    expect(points.some(([, y]) => y !== 0)).toBe(true)
  })
  it('stays within the jitter envelope', () => {
    const points = makeBolt([0, 0], [10, 0], 5, 0.25, Math.random)
    expect(Math.max(...points.map(([, y]) => Math.abs(y)))).toBeLessThanOrEqual(10 * 0.25)
  })
})
