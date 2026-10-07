import { expect, it } from 'vitest'

// The site must not show emoji (user request): icons come from <Icon> (Lucide) instead.
const sources = {
  ...import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>

it('no emoji in app code or seed data', () => {
  const offenders = Object.entries(sources).flatMap(([file, text]) =>
    text.split('\n').flatMap((line, i) => (/\p{Extended_Pictographic}/u.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  )
  expect(offenders).toEqual([])
})
