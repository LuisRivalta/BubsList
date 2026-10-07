import type { AppData, Completion, Photo, Quest } from './types'

export const doneQuestIds = (completions: Completion[]) => new Set(completions.map((c) => c.quest_id))

export function childrenOf(quests: Quest[], parentId: string | null): Quest[] {
  return quests.filter((q) => q.parent_id === parentId).sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function ancestors(quests: Quest[], id: string): Quest[] {
  const byId = new Map(quests.map((q) => [q.id, q]))
  const path: Quest[] = []
  let parentId = byId.get(id)?.parent_id ?? null
  while (parentId && path.length < quests.length) {
    const parent = byId.get(parentId)
    if (!parent) break
    path.unshift(parent)
    parentId = parent.parent_id
  }
  return path
}

export const pathLabel = (quests: Quest[], id: string) => ancestors(quests, id).map((q) => q.title).join(' › ')

export function descendantIds(quests: Quest[], id: string): string[] {
  const out: string[] = []
  const stack = [id]
  while (stack.length) {
    const current = stack.pop()!
    for (const q of quests) {
      if (q.parent_id === current) {
        out.push(q.id)
        stack.push(q.id)
      }
    }
  }
  return out
}

export function subquestProgress(quests: Quest[], done: Set<string>, id: string) {
  const kids = quests.filter((q) => q.parent_id === id)
  return { done: kids.filter((k) => done.has(k.id)).length, total: kids.length }
}

type PhotoData = Pick<AppData, 'quests' | 'completions' | 'reviews' | 'photos'>

export function subtreePhotos(data: PhotoData, questId: string): Photo[] {
  const questIds = new Set([questId, ...descendantIds(data.quests, questId)])
  const completionIds = new Set(data.completions.filter((c) => questIds.has(c.quest_id)).map((c) => c.id))
  const reviewIds = new Set(data.reviews.filter((r) => completionIds.has(r.completion_id)).map((r) => r.id))
  return data.photos.filter(
    (p) => (p.quest_id !== null && questIds.has(p.quest_id)) || (p.review_id !== null && reviewIds.has(p.review_id)),
  )
}

export function completionPhotos(data: PhotoData, completionId: string): Photo[] {
  const reviewIds = new Set(data.reviews.filter((r) => r.completion_id === completionId).map((r) => r.id))
  return data.photos.filter((p) => p.review_id !== null && reviewIds.has(p.review_id))
}

// The quest's own city, or the nearest ancestor's (a subquest of "Japão — Tóquio" lives in Tóquio).
export function effectiveCity(quests: Quest[], id: string): string | null {
  const byId = new Map(quests.map((q) => [q.id, q]))
  let q = byId.get(id)
  for (let hops = 0; q && hops <= quests.length; hops++) {
    if (q.city?.trim()) return q.city.trim()
    q = q.parent_id ? byId.get(q.parent_id) : undefined
  }
  return null
}

// "Hamburgueria · Ribeirão Preto" — only the parts that exist.
export function questMeta(data: Pick<AppData, 'quests' | 'questTypes'>, quest: Quest): string {
  const type = data.questTypes.find((t) => t.id === quest.type_id)?.name
  return [type, effectiveCity(data.quests, quest.id)].filter(Boolean).join(' · ')
}
