import { describe, expect, it } from 'vitest'
import { PARTNER, achievement, category, completion, photo, quest, review } from '../test/fixtures'
import { formatDate, todayISO } from './dates'
import { buildReport, last3Period, monthPeriod, shiftPeriod, yearPeriod } from './report'

describe('dates', () => {
  it('formats and reads today', () => {
    expect(formatDate('2026-10-06')).toBe('06/10/2026')
    expect(todayISO(new Date(2026, 9, 6, 23, 59))).toBe('2026-10-06')
  })
})

describe('periods', () => {
  it('month period with pt-BR label', () => {
    expect(monthPeriod(2026, 10)).toMatchObject({ start: '2026-10-01', end: '2026-10-31', label: 'outubro de 2026' })
  })
  it('february of a leap year', () => expect(monthPeriod(2028, 2).end).toBe('2028-02-29'))
  it('year period', () => expect(yearPeriod(2026)).toMatchObject({ start: '2026-01-01', end: '2026-12-31', label: '2026' }))
  it('last 3 months = current month and the two before', () => {
    expect(last3Period('2026-10-06')).toMatchObject({ start: '2026-08-01', end: '2026-10-31', label: 'Últimos 3 meses' })
  })
  it('last 3 months in January reaches into the previous year', () => {
    expect(last3Period('2026-01-15')).toMatchObject({ start: '2025-11-01', end: '2026-01-31' })
  })
  it('shifts months and years', () => {
    expect(shiftPeriod(monthPeriod(2026, 12), 1)).toMatchObject({ start: '2027-01-01' })
    expect(shiftPeriod(monthPeriod(2026, 1), -1)).toMatchObject({ start: '2025-12-01' })
    expect(shiftPeriod(yearPeriod(2026), -1)).toMatchObject({ start: '2025-01-01' })
  })
})

describe('buildReport', () => {
  const rest = category({ id: 'rest', name: 'Restaurante' })
  const filme = category({ id: 'filme', name: 'Filme' })
  const outro = category({ id: 'outro', name: 'Outro' })
  const japao = quest({ id: 'japao', title: 'Japão', category_id: 'outro' })
  const ichiran = quest({ id: 'ichiran', parent_id: 'japao', title: 'Ichiran', category_id: 'rest', difficulty: 'medium' })
  const matrix = quest({ id: 'matrix', title: 'Matrix', category_id: 'filme' })
  const c1 = completion({ id: 'c1', quest_id: 'ichiran', done_on: '2026-10-01' })
  const c2 = completion({ id: 'c2', quest_id: 'ichiran', done_on: '2026-10-31' })
  const c3 = completion({ id: 'c3', quest_id: 'matrix', done_on: '2026-10-15' })
  const c4 = completion({ id: 'c4', quest_id: 'matrix', done_on: '2026-09-30', created_at: '2026-10-02T00:00:00Z' })
  const data = {
    quests: [japao, ichiran, matrix],
    categories: [rest, filme, outro],
    completions: [c1, c2, c3, c4],
    reviews: [
      review({ id: 'r1', completion_id: 'c1', rating: 5 }),
      review({ id: 'r2', completion_id: 'c1', user_id: PARTNER, rating: 4 }),
      review({ id: 'r3', completion_id: 'c3', rating: 3 }),
      review({ id: 'r4', completion_id: 'c4', rating: 5 }),
    ],
    photos: [photo({ id: 'p1', review_id: 'r1' }), photo({ id: 'p4', review_id: 'r4' }), photo({ id: 'pref', quest_id: 'matrix' })],
  }
  const oct = monthPeriod(2026, 10)

  it('counts every completion in range by done_on, inclusive', () => {
    const r = buildReport(oct, data, [])
    expect(r.total).toBe(3)
    expect(r.byCategory.map((x) => [x.category.name, x.count])).toEqual([['Restaurante', 2], ['Filme', 1]])
    expect(r.byDifficulty).toEqual({ easy: 1, medium: 2, hard: 0, epic: 0 })
  })

  it('timeline is newest first with the parent path', () => {
    const r = buildReport(oct, data, [])
    expect(r.timeline.map((i) => i.completion.id)).toEqual(['c2', 'c3', 'c1'])
    expect(r.timeline[0].path).toBe('Japão')
  })

  it('best moments by average rating', () => {
    expect(buildReport(oct, data, []).best.map((i) => [i.completion.id, i.average])).toEqual([['c1', 4.5], ['c3', 3]])
  })

  it('album only has review photos from the period', () => {
    expect(buildReport(oct, data, []).photos.map((p) => p.id)).toEqual(['p1'])
  })

  it('lists achievements unlocked in the period', () => {
    const inside = achievement({ id: 'inside' })
    const statuses = [
      { achievement: inside, unlockedOn: '2026-10-10', current: 1, target: 1 },
      { achievement: achievement(), unlockedOn: '2026-09-10', current: 1, target: 1 },
      { achievement: achievement(), unlockedOn: null, current: 0, target: 1 },
    ]
    expect(buildReport(oct, data, statuses).unlocked.map((s) => s.achievement.id)).toEqual(['inside'])
  })

  it('a September memory registered in October counts in September', () => {
    expect(buildReport(monthPeriod(2026, 9), data, []).timeline.map((i) => i.completion.id)).toEqual(['c4'])
  })
})
