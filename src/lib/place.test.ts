import { afterEach, describe, expect, it, vi } from 'vitest'
import { quest } from '../test/fixtures'
import { effectivePlace, mostSpecific, normalizePlace, placeLabel, placeOptions, placeWithin, searchPlaces } from './place'

describe('normalizePlace', () => {
  it('cuts the parts at 80 characters and the label at 200, the database limits', () => {
    const long = (c: string) => c.repeat(120)
    const p = normalizePlace({ name: long('N'), lat: '1', lon: '2', address: { city: long('C'), state: long('S'), country: long('P') } })
    expect([p.city!.length, p.state!.length, p.country!.length]).toEqual([80, 80, 80])
    expect(p.label.length).toBeLessThanOrEqual(200)
    expect(p.label).not.toMatch(/[\s,]$/)
  })
  it('reads city, state and country, and builds a label without repeats', () => {
    expect(
      normalizePlace({ name: 'Ribeirão Preto', lat: '-21.17', lon: '-47.81', address: { city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil' } }),
    ).toEqual({ city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil', label: 'Ribeirão Preto, São Paulo, Brasil', lat: -21.17, lng: -47.81 })
  })
  it('uses town or village when there is no city, and keeps a place name before it', () => {
    expect(normalizePlace({ name: 'Brabus Burguer', lat: '1', lon: '2', address: { town: 'Brodowski', state: 'São Paulo', country: 'Brasil' } }).label)
      .toBe('Brabus Burguer, Brodowski, São Paulo, Brasil')
    expect(normalizePlace({ name: 'Cunha', lat: '1', lon: '2', address: { village: 'Cunha', country: 'Brasil' } }).city).toBe('Cunha')
  })
  it('a country or a state alone keeps only its levels', () => {
    expect(normalizePlace({ name: 'Japão', lat: '36', lon: '138', address: { country: 'Japão' } })).toMatchObject({ city: null, state: null, country: 'Japão', label: 'Japão' })
    expect(normalizePlace({ name: 'São Paulo', lat: '1', lon: '2', address: { state: 'São Paulo', country: 'Brasil' } })).toMatchObject({ city: null, state: 'São Paulo', label: 'São Paulo, Brasil' })
  })
})

describe('searchPlaces', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('asks Nominatim in Portuguese for 5 places with address details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ name: 'Japão', lat: '36', lon: '138', address: { country: 'Japão' } }] })
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchPlaces('japao')).toEqual([{ city: null, state: null, country: 'Japão', label: 'Japão', lat: 36, lng: 138 }])
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'japao', format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'pt-BR' })
  })
  it('fails loudly on an HTTP error so the field can say so', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(searchPlaces('erro')).rejects.toThrow('429')
  })
  it('answers a repeated query from the cache (Nominatim policy)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ name: 'Cunha', lat: '1', lon: '2', address: { city: 'Cunha', country: 'Brasil' } }] })
    vi.stubGlobal('fetch', fetchMock)
    await searchPlaces('Cunha')
    expect(await searchPlaces(' cunha ')).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('drops suggestions with a repeated label', async () => {
    const row = { name: 'Bonfim Paulista', lat: '1', lon: '2', address: { village: 'Bonfim Paulista', state: 'São Paulo', country: 'Brasil' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [row, { ...row, lat: '1.1' }] }))
    expect(await searchPlaces('bonfim')).toHaveLength(1)
  })
  it('waits at least a second between two requests (Nominatim policy)', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    await vi.advanceTimersByTimeAsync(1100)
    await searchPlaces('primeira')
    const second = searchPlaces('segunda')
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(600)
    await second
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

const japao = quest({ id: 'japao', city: null, country: 'Japão ' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', city: 'Tóquio', country: 'Japão' })
const ramen = quest({ id: 'ramen', parent_id: 'toquio' })
const rp = quest({ id: 'rp', city: 'Ribeirão Preto', state: 'São Paulo', country: 'Brasil' })
const rpOld = quest({ id: 'rp-old', city: 'ribeirao preto ' })
const camp = quest({ id: 'camp', city: 'Campinas', state: 'São Paulo', country: 'Brasil' })
const sm = quest({ id: 'sm', city: 'Santa Maria', state: 'Rio Grande do Sul', country: 'Brasil' })
const smDf = quest({ id: 'sm-df', city: 'Santa Maria', state: 'Distrito Federal', country: 'Brasil' })
const anime = quest({ id: 'anime' })
const all = [japao, toquio, ramen, rp, rpOld, camp, sm, smDf, anime]

describe('effectivePlace', () => {
  it('uses the quest own place, trimmed', () => expect(effectivePlace(all, 'japao')).toEqual({ city: null, state: null, country: 'Japão' }))
  it('inherits the nearest ancestor place', () => expect(effectivePlace(all, 'ramen')).toEqual({ city: 'Tóquio', state: null, country: 'Japão' }))
  it('is null when nobody up the tree has a place', () => expect(effectivePlace(all, 'anime')).toBeNull())
  it('labels and picks the most specific level', () => {
    const p = effectivePlace(all, 'rp')!
    expect(placeLabel(p)).toBe('Ribeirão Preto, São Paulo, Brasil')
    expect(mostSpecific(p)).toBe('Ribeirão Preto')
    expect(mostSpecific(effectivePlace(all, 'japao')!)).toBe('Japão')
  })
})

describe('placeOptions', () => {
  const labels = (list: { label: string }[]) => list.map((o) => o.label)
  it('lists countries, states and cities once each, alphabetically', () => {
    const o = placeOptions(all)
    expect(labels(o.country)).toEqual(['Brasil', 'Japão'])
    expect(labels(o.state)).toEqual(['Distrito Federal', 'Rio Grande do Sul', 'São Paulo'])
  })
  it('a legacy city typed without state merges into the full city of the same name', () => {
    expect(labels(placeOptions(all, [rp, rpOld]).city)).toEqual(['Ribeirão Preto'])
  })
  it('cities with the same name in different states show the state', () => {
    expect(labels(placeOptions(all, [sm, smDf]).city)).toEqual(['Santa Maria · Distrito Federal', 'Santa Maria · Rio Grande do Sul'])
  })
})

describe('placeWithin', () => {
  const key = (level: 'country' | 'state' | 'city', label: string) => placeOptions(all)[level].find((o) => o.label === label)!.key
  const within = (id: string, k: string) => placeWithin(effectivePlace(all, id)!, k)
  it('a country takes every place inside it', () => {
    expect(within('rp', key('country', 'Brasil'))).toBe(true)
    expect(within('camp', key('country', 'Brasil'))).toBe(true)
    expect(within('toquio', key('country', 'Brasil'))).toBe(false)
  })
  it('a state takes its cities only', () => {
    expect(within('camp', key('state', 'São Paulo'))).toBe(true)
    expect(within('sm', key('state', 'São Paulo'))).toBe(false)
  })
  it('a city takes that city, including the legacy one typed without state', () => {
    expect(within('rp', key('city', 'Ribeirão Preto'))).toBe(true)
    expect(within('rp-old', key('city', 'Ribeirão Preto'))).toBe(true)
    expect(within('camp', key('city', 'Ribeirão Preto'))).toBe(false)
  })
})
