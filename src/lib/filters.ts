import { effectiveCity } from './tree'
import type { Completion, Difficulty, Quest, Review } from './types'

export const normalizeText = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export const sameText = (a: string, b: string) => normalizeText(a) === normalizeText(b)

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
  categoryId: string | null
  typeIds: string[] // empty = any
  difficulties: Difficulty[] // empty = any
  cities: string[] // empty = any; compared with sameText against the effective city
}

// What "Sortear" picks from: pending quests you can do right now (none of their subquests still pending) that pass the filters.
export function drawPool(quests: Quest[], done: Set<string>, f: DrawFilter): Quest[] {
  const pending = quests.filter((q) => !done.has(q.id))
  const hasPendingChild = new Set(pending.flatMap((q) => q.parent_id ?? []))
  const cities = new Set(f.cities.map(normalizeText))
  return pending
    .filter((q) => !hasPendingChild.has(q.id))
    .filter((q) => !f.categoryId || q.category_id === f.categoryId)
    .filter((q) => !f.typeIds.length || (q.type_id !== null && f.typeIds.includes(q.type_id)))
    .filter((q) => !f.difficulties.length || f.difficulties.includes(q.difficulty))
    .filter((q) => !cities.size || cities.has(normalizeText(effectiveCity(quests, q.id) ?? '')))
}

// Effective cities of `among`, once each (first spelling wins), alphabetical.
export function cityOptions(quests: Quest[], among: Quest[] = quests): string[] {
  const seen = new Map<string, string>()
  for (const q of among) {
    const city = effectiveCity(quests, q.id)
    if (city && !seen.has(normalizeText(city))) seen.set(normalizeText(city), city)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function pendingReviews(completions: Completion[], reviews: Review[], userId: string): Completion[] {
  const reviewed = new Set(reviews.filter((r) => r.user_id === userId).map((r) => r.completion_id))
  return completions.filter((c) => !reviewed.has(c.id)).sort((a, b) => b.done_on.localeCompare(a.done_on))
}
