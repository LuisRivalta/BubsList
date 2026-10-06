import { difficultyRank } from './difficulty'
import type { Achievement, Completion, Quest, Rarity } from './types'

export const RARITIES: Rarity[] = ['platinum', 'gold', 'silver', 'bronze']

export const RARITY_LABEL: Record<Rarity, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
}

export interface AchievementStatus {
  achievement: Achievement
  unlockedOn: string | null
  current: number
  target: number
}

export function evaluateAchievements(achievements: Achievement[], quests: Quest[], completions: Completion[]): AchievementStatus[] {
  const questById = new Map(quests.map((q) => [q.id, q]))
  const ordered = [...completions].sort((a, b) => a.done_on.localeCompare(b.done_on) || a.created_at.localeCompare(b.created_at))
  return achievements.map((a) =>
    a.kind === 'manual'
      ? { achievement: a, unlockedOn: a.manual_unlocked_on, current: a.manual_unlocked_on ? 1 : 0, target: 1 }
      : evaluateAuto(a, questById, ordered),
  )
}

function evaluateAuto(a: Achievement, questById: Map<string, Quest>, ordered: Completion[]): AchievementStatus {
  const target = a.rule_count ?? 1
  const seen = new Set<string>()
  let unlockedOn: string | null = null
  for (const c of ordered) {
    const q = questById.get(c.quest_id)
    if (!q) continue
    if (a.rule_category_id && q.category_id !== a.rule_category_id) continue
    if (a.rule_min_difficulty && difficultyRank(q.difficulty) < difficultyRank(a.rule_min_difficulty)) continue
    seen.add(q.media_id ?? q.id)
    if (!unlockedOn && seen.size >= target) unlockedOn = c.done_on
  }
  return { achievement: a, unlockedOn, current: Math.min(seen.size, target), target }
}

export function newlyUnlocked(before: AchievementStatus[], after: AchievementStatus[]): Achievement[] {
  const already = new Set(before.filter((s) => s.unlockedOn).map((s) => s.achievement.id))
  return after.filter((s) => s.unlockedOn && !already.has(s.achievement.id)).map((s) => s.achievement)
}
