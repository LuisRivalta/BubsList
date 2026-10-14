import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { Pin } from '../lib/map'
import { quest } from '../test/fixtures'
import QuestMap from './QuestMap'

// jsdom has no layout for a real Leaflet map: a stand-in that records what the map is asked to do.
// Chainable calls are vi.fn(impl), so restoreMocks between tests keeps them returning the stand-in.
const fake = vi.hoisted(() => {
  const map = { setView: vi.fn((): unknown => map), fitBounds: vi.fn(), remove: vi.fn() }
  const layer = { addTo: vi.fn((): unknown => layer), clearLayers: vi.fn() }
  const marker = { on: vi.fn((): unknown => marker), addTo: vi.fn() }
  return { map, layer, marker }
})
vi.mock('leaflet', () => ({
  default: {
    map: () => fake.map,
    tileLayer: () => ({ addTo: () => {} }),
    layerGroup: () => fake.layer,
    divIcon: () => ({}),
    marker: () => fake.marker,
    latLngBounds: (b: unknown) => b,
  },
}))

const pin = (key: string, lat: number): Pin => ({ key, lat, lng: -47, quests: [quest()], pending: true })

it('frames the pins when it opens and when the filter changes, never when a change arrives from the other phone', () => {
  const { rerender } = render(<QuestMap pins={[pin('a', -21)]} frame="all" onPick={() => {}} />)
  expect(fake.map.fitBounds).toHaveBeenCalledTimes(1)
  rerender(<QuestMap pins={[pin('a', -21), pin('b', -22)]} frame="all" onPick={() => {}} />)
  expect(fake.layer.clearLayers).toHaveBeenCalledTimes(2)
  expect(fake.map.fitBounds).toHaveBeenCalledTimes(1)
  rerender(<QuestMap pins={[pin('b', -22)]} frame="done" onPick={() => {}} />)
  expect(fake.map.fitBounds).toHaveBeenCalledTimes(2)
})
