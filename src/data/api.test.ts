import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../lib/supabase'
import { loadAll } from './api'

it('pages through tables with more than 1000 rows', async () => {
  const rows = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }))
  const builder = (table: string) => {
    const b = {
      select: () => b,
      order: () => b,
      range: (from: number) =>
        Promise.resolve({ data: table === 'quests' ? (from === 0 ? rows(1000, 'a') : rows(5, 'b')) : [], error: null }),
    }
    return b
  }
  vi.mocked(supabase.from).mockImplementation(builder as never)
  const data = await loadAll()
  expect(data.quests).toHaveLength(1005)
  expect(data.categories).toEqual([])
})
