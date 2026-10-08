import { expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }))

import { supabase } from '../lib/supabase'
import { loadAll, saveQuestType, setCategoryPlace, uploadAvatar } from './api'

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

it('loads the quest types with everything else', async () => {
  const tables: string[] = []
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    tables.push(table)
    const b = { select: () => b, order: () => b, range: () => Promise.resolve({ data: table === 'quest_types' ? [{ id: 't1' }] : [], error: null }) }
    return b
  }) as never)
  const data = await loadAll()
  expect(tables).toContain('quest_types')
  expect(data.questTypes).toEqual([{ id: 't1' }])
})

it('saving a quest type inserts it, or updates it by id, and returns the row', async () => {
  const single = vi.fn().mockResolvedValue({ data: { id: 't1', name: 'Hamburgueria' }, error: null })
  const chain = { select: () => ({ single }) }
  const insert = vi.fn(() => chain)
  const eq = vi.fn(() => chain)
  const update = vi.fn(() => ({ eq }))
  vi.mocked(supabase.from).mockReturnValue({ insert, update } as never)
  expect(await saveQuestType({ category_id: 'c1', name: 'Hamburgueria' })).toEqual({ id: 't1', name: 'Hamburgueria' })
  expect(insert).toHaveBeenCalledWith({ category_id: 'c1', name: 'Hamburgueria' })
  await saveQuestType({ id: 't1', category_id: 'c1', name: 'Hamburguer' })
  expect(update).toHaveBeenCalledWith({ category_id: 'c1', name: 'Hamburguer' })
  expect(eq).toHaveBeenCalledWith('id', 't1')
})

it('setCategoryPlace switches the physical place of a category', async () => {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null })
  const update = vi.fn(() => ({ eq }))
  vi.mocked(supabase.from).mockReturnValue({ update } as never)
  await setCategoryPlace('c1', true)
  expect(supabase.from).toHaveBeenCalledWith('categories')
  expect(update).toHaveBeenCalledWith({ has_place: true })
  expect(eq).toHaveBeenCalledWith('id', 'c1')
})
