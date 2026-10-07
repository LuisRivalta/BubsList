import type { Completion, Difficulty, Quest, Review } from './types'

export const normalizeText = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export interface QuestFilter {
  tab: 'pending' | 'done'
  categoryId: string | null
  difficulty: Difficulty | null
  search: string
}

export function filterQuests(quests: Quest[], done: Set<string>, f: QuestFilter): Quest[] {
  const term = normalizeText(f.search)
  return quests
    .filter((q) => (term ? normalizeText(q.title).includes(term) : q.parent_id === null))
    .filter((q) => done.has(q.id) === (f.tab === 'done'))
    .filter((q) => !f.categoryId || q.category_id === f.categoryId)
    .filter((q) => !f.difficulty || q.difficulty === f.difficulty)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// What "Sortear" picks from: pending quests you can do right now (none of their subquests still pending).
export function drawPool(quests: Quest[], done: Set<string>, f: Pick<QuestFilter, 'categoryId' | 'difficulty'>): Quest[] {
  const pending = quests.filter((q) => !done.has(q.id))
  const hasPendingChild = new Set(pending.flatMap((q) => q.parent_id ?? []))
  return pending
    .filter((q) => !hasPendingChild.has(q.id))
    .filter((q) => !f.categoryId || q.category_id === f.categoryId)
    .filter((q) => !f.difficulty || q.difficulty === f.difficulty)
}

export function pendingReviews(completions: Completion[], reviews: Review[], userId: string): Completion[] {
  const reviewed = new Set(reviews.filter((r) => r.user_id === userId).map((r) => r.completion_id))
  return completions.filter((c) => !reviewed.has(c.id)).sort((a, b) => b.done_on.localeCompare(a.done_on))
}
