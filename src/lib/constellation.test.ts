import { describe, expect, it } from 'vitest'
import { HOPS, hopDelays, hopSequence, pickStars } from './constellation'

describe('hopDelays', () => {
  it('slows down hop after hop and lasts about two seconds', () => {
    const d = hopDelays()
    expect(d).toHaveLength(HOPS)
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1])
    const total = d.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(1800)
    expect(total).toBeLessThan(2400)
  })
})

describe('hopSequence', () => {
  it('ends on the winner and never lights the same star twice in a row', () => {
    for (const stars of [2, 5, 40]) {
      const seq = hopSequence(stars, 1)
      expect(seq).toHaveLength(HOPS)
      expect(seq.at(-1)).toBe(1)
      seq.forEach((s, i) => {
        expect(s).toBeGreaterThanOrEqual(0)
        expect(s).toBeLessThan(stars)
        if (i > 0) expect(s).not.toBe(seq[i - 1])
      })
    }
  })
  it('with a single star every hop is that star', () => expect(hopSequence(1, 0)).toEqual(Array(HOPS).fill(0)))
})

describe('pickStars', () => {
  it('keeps at most 40 stars, always including the winner, without repeats', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const stars = pickStars(items, 37)
    expect(stars).toHaveLength(40)
    expect(stars).toContain(37)
    expect(new Set(stars).size).toBe(40)
  })
  it('uses every item when there are few', () => expect(pickStars(['a', 'b', 'c'], 'b').sort()).toEqual(['a', 'b', 'c']))
})
