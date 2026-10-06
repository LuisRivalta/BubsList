import { describe, expect, it } from 'vitest'
import { achievement, category, completion, quest } from '../test/fixtures'
import { describeRule, evaluateAchievements, newlyUnlocked } from './achievements'

const q1 = quest({ id: 'q1', category_id: 'rest', difficulty: 'easy' })
const q2 = quest({ id: 'q2', category_id: 'rest', difficulty: 'hard' })
const q3 = quest({ id: 'q3', category_id: 'filme', difficulty: 'epic' })
const quests = [q1, q2, q3]
const one = (a: Parameters<typeof achievement>[0], completions: ReturnType<typeof completion>[], qs = quests) =>
  evaluateAchievements([achievement(a)], qs, completions)[0]

describe('evaluateAchievements', () => {
  it('counts completions of the rule category', () => {
    const s = one({ rule_category_id: 'rest', rule_count: 2 }, [
      completion({ quest_id: 'q1', done_on: '2026-01-05' }),
      completion({ quest_id: 'q3', done_on: '2026-01-06' }),
      completion({ quest_id: 'q2', done_on: '2026-02-10' }),
    ])
    expect(s).toMatchObject({ unlockedOn: '2026-02-10', current: 2, target: 2 })
  })

  it('minimum difficulty also counts harder quests', () => {
    const s = one({ rule_min_difficulty: 'hard', rule_count: 2 }, [
      completion({ quest_id: 'q1', done_on: '2026-01-01' }),
      completion({ quest_id: 'q2', done_on: '2026-03-01' }),
      completion({ quest_id: 'q3', done_on: '2026-03-02' }),
    ])
    expect(s).toMatchObject({ unlockedOn: '2026-03-02', current: 2 })
  })

  it('redoing the same quest does not count twice', () => {
    const s = one({ rule_count: 2 }, [
      completion({ quest_id: 'q1', done_on: '2026-01-01' }),
      completion({ quest_id: 'q1', done_on: '2026-06-01' }),
    ])
    expect(s).toMatchObject({ unlockedOn: null, current: 1, target: 2 })
  })

  it('two quests with the same media count once', () => {
    const a = quest({ id: 'a', media_id: 'm1' })
    const b = quest({ id: 'b', media_id: 'm1' })
    expect(one({ rule_count: 2 }, [completion({ quest_id: 'a' }), completion({ quest_id: 'b' })], [a, b]).current).toBe(1)
  })

  it('a memory registered later unlocks on the date it happened', () => {
    const late = completion({ quest_id: 'q1', done_on: '2025-12-24', created_at: '2026-10-05T10:00:00Z' })
    const early = completion({ quest_id: 'q2', done_on: '2026-03-01', created_at: '2026-03-01T10:00:00Z' })
    expect(one({ rule_count: 1 }, [early, late]).unlockedOn).toBe('2025-12-24')
  })

  it('is locked without completions and ignores deleted quests', () => {
    expect(one({ rule_count: 1 }, []).unlockedOn).toBeNull()
    expect(one({ rule_count: 1 }, [completion({ quest_id: 'gone' })]).current).toBe(0)
  })

  it('manual achievements use the stored date', () => {
    expect(one({ kind: 'manual', rule_count: null, manual_unlocked_on: '2026-07-01' }, [])).toMatchObject({ unlockedOn: '2026-07-01', current: 1, target: 1 })
    expect(one({ kind: 'manual', rule_count: null }, [])).toMatchObject({ unlockedOn: null, current: 0, target: 1 })
  })
})

it('newlyUnlocked lists only achievements unlocked by the change', () => {
  const first = achievement({ id: 'first', rule_count: 1 })
  const two = achievement({ id: 'two', rule_count: 2 })
  const before = evaluateAchievements([first, two], quests, [])
  const after = evaluateAchievements([first, two], quests, [completion({ quest_id: 'q1' })])
  expect(newlyUnlocked(before, after).map((a) => a.id)).toEqual(['first'])
})

it('describes a rule', () => {
  const rest = category({ id: 'rest', name: 'Restaurante' })
  expect(describeRule(achievement({ rule_category_id: 'rest', rule_min_difficulty: 'hard', rule_count: 10 }), [rest])).toBe('Restaurante · Difícil+ · 10')
  expect(describeRule(achievement({ rule_min_difficulty: 'epic', rule_count: 5 }), [])).toBe('Qualquer categoria · Épica · 5')
})
