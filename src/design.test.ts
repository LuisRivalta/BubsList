import { expect, it } from 'vitest'
import fonts from './fonts.ts?raw'

const sources = import.meta.glob('./**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

it('loads only the latin subset of each font weight', () => {
  const imports = [...fonts.matchAll(/import '(.+)'/g)].map((m) => m[1])
  expect(imports.length).toBeGreaterThan(0)
  for (const i of imports) expect(i).toMatch(/\/latin-\d+\.css$/)
})

it('ink text keeps at least 60% opacity so it passes WCAG AA on white and paper', () => {
  const weak = Object.entries(sources).flatMap(([file, src]) =>
    [...src.matchAll(/text-ink\/(\d+)/g)].filter((m) => Number(m[1]) < 60).map((m) => `${file}: ${m[0]}`),
  )
  expect(weak).toEqual([])
})
