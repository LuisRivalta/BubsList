import { describe, expect, it } from 'vitest'
import { appData, completion, photo, quest, review } from '../test/fixtures'
import { ancestors, childrenOf, completionPhotos, descendantIds, doneQuestIds, pathLabel, subquestProgress, subtreePhotos } from './tree'

const japao = quest({ id: 'japao', title: 'Japão', created_at: '2026-01-01T00:00:00Z' })
const toquio = quest({ id: 'toquio', parent_id: 'japao', title: 'Tóquio', created_at: '2026-01-02T00:00:00Z' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', created_at: '2026-01-01T12:00:00Z' })
const ichiran = quest({ id: 'ichiran', parent_id: 'toquio', title: 'Ichiran' })
const rio = quest({ id: 'rio', title: 'Rio', created_at: '2026-03-01T00:00:00Z' })
const quests = [japao, toquio, fuji, ichiran, rio]

describe('tree', () => {
  it('lists direct children oldest first', () => {
    expect(childrenOf(quests, 'japao').map((q) => q.id)).toEqual(['fuji', 'toquio'])
    expect(childrenOf(quests, null).map((q) => q.id)).toEqual(['japao', 'rio'])
  })

  it('builds the ancestor path root first', () => {
    expect(ancestors(quests, 'ichiran').map((q) => q.title)).toEqual(['Japão', 'Tóquio'])
    expect(pathLabel(quests, 'ichiran')).toBe('Japão › Tóquio')
    expect(ancestors(quests, 'japao')).toEqual([])
  })

  it('collects descendants at any depth', () => {
    expect(descendantIds(quests, 'japao').sort()).toEqual(['fuji', 'ichiran', 'toquio'])
  })

  it('counts done direct children', () => {
    const done = doneQuestIds([completion({ quest_id: 'fuji' }), completion({ quest_id: 'ichiran' })])
    expect(subquestProgress(quests, done, 'japao')).toEqual({ done: 1, total: 2 })
  })
})

describe('photos affected by deletions', () => {
  it('collects reference and review photos of the whole subtree, sub-subquests included', () => {
    const c = completion({ id: 'c1', quest_id: 'ichiran' })
    const r = review({ id: 'r1', completion_id: 'c1' })
    const data = appData({
      quests,
      completions: [c],
      reviews: [r],
      photos: [photo({ id: 'p-ref', quest_id: 'ichiran' }), photo({ id: 'p-rev', review_id: 'r1' }), photo({ id: 'p-rio', quest_id: 'rio' })],
    })
    expect(subtreePhotos(data, 'japao').map((p) => p.id).sort()).toEqual(['p-ref', 'p-rev'])
    expect(completionPhotos(data, 'c1').map((p) => p.id)).toEqual(['p-rev'])
  })
})
