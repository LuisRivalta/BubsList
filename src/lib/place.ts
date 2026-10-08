// Places in levels (country → state → city), from the OpenStreetMap search, and how the draw matches them.
import { normalizeText, sameText } from './text'
import type { Quest } from './types'

export interface Place {
  city: string | null
  state: string | null
  country: string | null
}
export interface PlaceChoice extends Place {
  label: string
  lat: number
  lng: number
}
export type PlaceLevel = 'country' | 'state' | 'city'
export interface PlaceOption {
  key: string
  label: string
  level: PlaceLevel
}

interface NominatimResult {
  name?: string
  lat: string
  lon: string
  address?: Record<string, string | undefined>
}

export function normalizePlace(r: NominatimResult): PlaceChoice {
  const a = r.address ?? {}
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? null
  const state = a.state ?? null
  const country = a.country ?? null
  const parts = [city, state, country].filter((p): p is string => !!p)
  const name = r.name && !parts.some((p) => sameText(p, r.name!)) ? r.name : null
  return { city, state, country, label: [name, ...parts].filter(Boolean).join(', '), lat: Number(r.lat), lng: Number(r.lon) }
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceChoice[]> {
  const params = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'pt-BR' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  return ((await res.json()) as NominatimResult[]).map(normalizePlace)
}

const clean = (s: string | null | undefined) => (s?.trim() ? s.trim() : null)

// The quest's own place, or the nearest ancestor's (Japão → Tóquio → Ichiran).
export function effectivePlace(quests: Quest[], id: string): Place | null {
  const byId = new Map(quests.map((q) => [q.id, q]))
  let q = byId.get(id)
  for (let hops = 0; q && hops <= quests.length; hops++) {
    const p = { city: clean(q.city), state: clean(q.state), country: clean(q.country) }
    if (p.city || p.state || p.country) return p
    q = q.parent_id ? byId.get(q.parent_id) : undefined
  }
  return null
}

export const placeLabel = (p: Place) => [p.city, p.state, p.country].filter(Boolean).join(', ')
export const mostSpecific = (p: Place) => p.city ?? p.state ?? p.country

const n = (s: string | null) => (s ? normalizeText(s) : '')

// Chips for the draw, from the effective places of `among`. Keys: "country:c", "state:c|s", "city:c|s|ci" (normalized).
export function placeOptions(quests: Quest[], among: Quest[] = quests): Record<PlaceLevel, PlaceOption[]> {
  const found: Record<PlaceLevel, Map<string, PlaceOption & { state: string | null }>> = { country: new Map(), state: new Map(), city: new Map() }
  const add = (level: PlaceLevel, key: string, label: string, state: string | null) => {
    if (!found[level].has(key)) found[level].set(key, { key, label, level, state })
  }
  for (const q of among) {
    const p = effectivePlace(quests, q.id)
    if (!p) continue
    if (p.country) add('country', `country:${n(p.country)}`, p.country, null)
    if (p.state) add('state', `state:${n(p.country)}|${n(p.state)}`, p.state, null)
    if (p.city) add('city', `city:${n(p.country)}|${n(p.state)}|${n(p.city)}`, p.city, p.state)
  }
  // A city typed without state/country (before the search existed) merges into a full city of the same name.
  const cities = [...found.city.values()]
  const legacy = (c: { key: string }) => c.key.startsWith('city:||')
  const kept = cities.filter((c) => !legacy(c) || !cities.some((f) => !legacy(f) && sameText(f.label, c.label)))
  const named = kept.map((c) => (c.state && kept.some((o) => o !== c && sameText(o.label, c.label)) ? { ...c, label: `${c.label} · ${c.state}` } : c))
  const sorted = (list: PlaceOption[]) =>
    list.map(({ key, label, level }) => ({ key, label, level })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  return { country: sorted([...found.country.values()]), state: sorted([...found.state.values()]), city: sorted(named) }
}

// Is this place inside the chip `key`? Missing levels on either side don't block a match (legacy cities).
export function placeWithin(p: Place, key: string): boolean {
  const [level, rest = ''] = key.split(':')
  const [country = '', state = '', city = ''] = rest.split('|')
  const matches = (value: string | null, wanted: string) => !wanted || !value || n(value) === wanted
  if (level === 'country') return !!p.country && n(p.country) === country
  if (level === 'state') return !!p.state && n(p.state) === state && matches(p.country, country)
  return !!p.city && n(p.city) === city && matches(p.state, state) && matches(p.country, country)
}
