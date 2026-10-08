import { expect, it } from 'vitest'
import { completion, quest } from '../test/fixtures'
import { mapPins } from './map'

const brabus = quest({ id: 'brabus', title: 'Brabus', lat: -21.1775, lng: -47.8103 })
const sushi = quest({ id: 'sushi', title: 'Akira Sushi', lat: -21.17751, lng: -47.81032 })
const rio = quest({ id: 'rio', title: 'Batata', lat: -22.9068, lng: -43.1729 })
const legacy = quest({ id: 'legacy', title: 'Pastel', city: 'Santos' })
const inherits = quest({ id: 'sub', title: 'Subquest', parent_id: 'brabus' })
const nothing = quest({ id: 'none', title: 'Filme' })
const data = { quests: [brabus, sushi, rio, legacy, inherits, nothing], completions: [completion({ quest_id: 'rio' })] }

it('groups quests on the same spot into one pin, quests by title', () => {
  const { pins } = mapPins(data, 'all')
  expect(pins.map((p) => p.quests.map((q) => q.id))).toEqual([['sushi', 'brabus'], ['rio']])
  expect(pins.map((p) => p.pending)).toEqual([true, false])
})

it('filters pending and done', () => {
  expect(mapPins(data, 'pending').pins.flatMap((p) => p.quests.map((q) => q.id))).toEqual(['sushi', 'brabus'])
  expect(mapPins(data, 'done').pins.flatMap((p) => p.quests.map((q) => q.id))).toEqual(['rio'])
})

it('a quest with a typed place but no position is listed apart; inherited or no place is neither', () => {
  const { pins, unplaced } = mapPins(data, 'all')
  expect(unplaced.map((q) => q.id)).toEqual(['legacy'])
  expect(pins.flatMap((p) => p.quests.map((q) => q.id))).not.toContain('sub')
})
