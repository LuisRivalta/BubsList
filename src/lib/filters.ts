import { normalizeText } from './text'
import { effectivePlace, placeWithin } from './place'
import type { Category, Completion, Difficulty, Quest, QuestType, Review } from './types'

export { normalizeText, sameText } from './text'

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

export interface DrawFilter {
  categoryIds: string[] // empty = any
  typeIds: string[] // empty = any; each type narrows only its own category
  difficulties: Difficulty[] // empty = any
  places: string[] // placeOptions keys; empty = any; only narrows categories with a physical place
}

// What "Sortear" picks from: pending quests you can do right now (none of their subquests still pending) that pass the filters.
export function drawPool(quests: Quest[], done: Set<string>, f: DrawFilter, ctx: { types?: QuestType[]; categories?: Category[] } = {}): Quest[] {
  const pending = quests.filter((q) => !done.has(q.id))
  const hasPendingChild = new Set(pending.flatMap((q) => q.parent_id ?? []))
  const categoryOf = new Map((ctx.types ?? []).map((t) => [t.id, t.category_id]))
  const physical = new Set((ctx.categories ?? []).filter((c) => c.has_place).map((c) => c.id))
  // "Filme + Restaurante + Hamburgueria" = any film, or a burger place: a chosen type narrows only its own category.
  const chosenTypes = (categoryId: string) => f.typeIds.filter((id) => categoryOf.get(id) === categoryId)
  return pending
    .filter((q) => !hasPendingChild.has(q.id))
    .filter((q) => !f.categoryIds.length || f.categoryIds.includes(q.category_id))
    .filter((q) => {
      const chosen = chosenTypes(q.category_id)
      return !chosen.length || (q.type_id !== null && chosen.includes(q.type_id))
    })
    .filter((q) => !f.difficulties.length || f.difficulties.includes(q.difficulty))
    // A place only narrows categories with a physical place: an anime is never cut by "Ribeirão Preto".
    .filter((q) => {
      if (!f.places.length || !physical.has(q.category_id)) return true
      const place = effectivePlace(quests, q.id)
      return !!place && f.places.some((k) => placeWithin(place, k))
    })
}

export function pendingReviews(completions: Completion[], reviews: Review[], userId: string): Completion[] {
  const reviewed = new Set(reviews.filter((r) => r.user_id === userId).map((r) => r.completion_id))
  return completions.filter((c) => !reviewed.has(c.id)).sort((a, b) => b.done_on.localeCompare(a.done_on))
}
