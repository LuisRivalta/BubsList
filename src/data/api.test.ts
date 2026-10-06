import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }))

import { supabase } from '../lib/supabase'
import { loadAll, uploadAvatar } from './api'

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

it('a new avatar gets a new path so the old cached picture is never shown, and the old file is removed', async () => {
  const bucket = { upload: vi.fn().mockResolvedValue({ data: {}, error: null }), remove: vi.fn().mockResolvedValue({ data: [], error: null }) }
  const update = vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) }))
  vi.mocked(supabase.storage.from).mockReturnValue(bucket as never)
  vi.mocked(supabase.from).mockReturnValue({ update } as never)

  await uploadAvatar('u1', new Blob(['x']), 'avatars/u1.jpg')

  const newPath = bucket.upload.mock.calls[0][0]
  expect(newPath).toMatch(/^avatars\/u1-.+\.jpg$/)
  expect(update).toHaveBeenCalledWith({ avatar_path: newPath })
  expect(bucket.remove).toHaveBeenCalledWith(['avatars/u1.jpg'])
})
