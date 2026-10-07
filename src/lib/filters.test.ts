import { describe, expect, it } from 'vitest'
import { ME, PARTNER, completion, quest, review } from '../test/fixtures'
import { filterQuests, pendingReviews, type QuestFilter } from './filters'

const japao = quest({ id: 'japao', title: 'Japão', category_id: 'viagem', difficulty: 'epic', created_at: '2026-01-01T00:00:00Z' })
const fuji = quest({ id: 'fuji', parent_id: 'japao', title: 'Monte Fuji', category_id: 'ativ' })
const acai = quest({ id: 'acai', title: 'Açaí do Pará', category_id: 'rest', created_at: '2026-02-01T00:00:00Z' })
const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme', created_at: '2026-03-01T00:00:00Z' })
const quests = [japao, fuji, acai, matrix]
const done = new Set(['matrix'])
const ids = (o: Partial<QuestFilter> = {}) =>
  filterQuests(quests, done, { tab: 'pending', categoryId: null, difficulty: null, search: '', ...o }).map((q) => q.id)

describe('filterQuests', () => {
  it('pending tab shows top-level pending quests, newest first', () => {
    expect(ids()).toEqual(['acai', 'japao'])
  })

  it('done tab shows done quests', () => {
    expect(ids({ tab: 'done' })).toEqual(['matrix'])
  })

  it('filters by category and difficulty', () => {
    expect(ids({ categoryId: 'viagem' })).toEqual(['japao'])
    expect(ids({ difficulty: 'epic' })).toEqual(['japao'])
  })

  it('search ignores accents and case', () => {
    expect(ids({ search: 'japao' })).toEqual(['japao'])
    expect(ids({ search: 'ACAI' })).toEqual(['acai'])
  })

  it('search also finds subquests', () => {
    expect(ids({ search: 'fuji' })).toEqual(['fuji'])
  })
})

describe('pendingReviews', () => {
  it('lists my unreviewed completions regardless of age, newest first', () => {
    const old = completion({ id: 'old', done_on: '2020-01-01' })
    const recent = completion({ id: 'recent', done_on: '2026-10-01' })
    const mine = completion({ id: 'mine', done_on: '2026-09-01' })
    const reviews = [review({ completion_id: 'mine', user_id: ME }), review({ completion_id: 'recent', user_id: PARTNER })]
    expect(pendingReviews([old, recent, mine], reviews, ME).map((c) => c.id)).toEqual(['recent', 'old'])
  })
})
