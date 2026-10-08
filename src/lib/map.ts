// Pins for the map: quests with their own position, grouped when they share a spot (two restaurants saved as "Ribeirão Preto").
import { doneQuestIds } from './tree'
import type { AppData, Quest } from './types'

export type MapShow = 'all' | 'pending' | 'done'
export interface Pin {
  key: string
  lat: number
  lng: number
  quests: Quest[]
  pending: boolean
}

const byTitle = (a: Quest, b: Quest) => a.title.localeCompare(b.title, 'pt-BR')

export function mapPins(data: Pick<AppData, 'quests' | 'completions'>, show: MapShow): { pins: Pin[]; unplaced: Quest[] } {
  const done = doneQuestIds(data.completions)
  const shown = data.quests.filter((q) => show === 'all' || (show === 'done') === done.has(q.id))
  const groups = new Map<string, Pin>()
  for (const q of shown) {
    if (q.lat === null || q.lng === null) continue
    const key = `${q.lat.toFixed(4)},${q.lng.toFixed(4)}` // about 11 m
    const pin = groups.get(key) ?? { key, lat: q.lat, lng: q.lng, quests: [], pending: false }
    pin.quests.push(q)
    pin.pending ||= !done.has(q.id)
    groups.set(key, pin)
  }
  const pins = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)).map((p) => ({ ...p, quests: p.quests.sort(byTitle) }))
  // A place typed before the search existed (or saved offline) has no position: listed so it can be picked again.
  const unplaced = shown.filter((q) => (q.lat === null || q.lng === null) && [q.city, q.state, q.country].some((s) => s?.trim())).sort(byTitle)
  return { pins, unplaced }
}
