import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))

import { fetchCatalogDetails, searchCatalog } from './catalog'
import { supabase } from './supabase'

const invoke = vi.mocked(supabase.functions.invoke)
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  invoke.mockReset()
})

const anilistReplies = (data: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }))

it('searches anime on AniList', async () => {
  anilistReplies({ Page: { media: [{ id: 21, title: { romaji: 'ONE PIECE', english: null }, coverImage: { large: 'u' }, seasonYear: 1999 }] } })
  expect(await searchCatalog('anime', 'one piece')).toEqual([{ source: 'anilist', external_id: '21', title: 'ONE PIECE', year: 1999, poster_url: 'u' }])
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('https://graphql.anilist.co')
  expect(JSON.parse(init.body).variables).toEqual({ q: 'one piece' })
})

it('fetches anime details by numeric id', async () => {
  anilistReplies({ Media: { id: 21, title: { english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 }, duration: 24, genres: [] } })
  expect((await fetchCatalogDetails('anilist', '21')).seasons).toEqual([{ season: 1, episodes: 1140 }])
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ id: 21 })
})

it('throws when AniList fails', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 500 }))
  await expect(searchCatalog('anime', 'x')).rejects.toThrow('AniList 500')
})

it('searches movies through the tmdb function', async () => {
  invoke.mockResolvedValue({ data: [], error: null } as never)
  await searchCatalog('movie', 'matrix')
  expect(invoke).toHaveBeenCalledWith('tmdb', { body: { action: 'search', type: 'movie', query: 'matrix' } })
})

it('series details use type tv', async () => {
  invoke.mockResolvedValue({ data: { title: 'Dark' }, error: null } as never)
  await fetchCatalogDetails('tmdb_tv', '70523')
  expect(invoke).toHaveBeenCalledWith('tmdb', { body: { action: 'details', type: 'tv', id: '70523' } })
})

it('propagates function errors', async () => {
  invoke.mockResolvedValue({ data: null, error: new Error('boom') } as never)
  await expect(searchCatalog('series', 'dark')).rejects.toThrow('boom')
})
