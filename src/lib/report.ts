import type { AchievementStatus } from './achievements'
import { daysInMonth, toISO } from './dates'
import { pathLabel } from './tree'
import type { AppData, Category, Completion, Difficulty, Photo, Quest, Review } from './types'

export type PeriodKind = 'month' | 'last3' | 'year'

export interface Period {
  kind: PeriodKind
  year: number
  month: number
  start: string
  end: string
  label: string
}

const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function monthPeriod(year: number, month: number): Period {
  return {
    kind: 'month', year, month,
    start: toISO(year, month, 1),
    end: toISO(year, month, daysInMonth(year, month)),
    label: MONTH_LABEL.format(Date.UTC(year, month - 1, 1)),
  }
}

export function yearPeriod(year: number): Period {
  return { kind: 'year', year, month: 1, start: toISO(year, 1, 1), end: toISO(year, 12, 31), label: String(year) }
}

export function last3Period(today: string): Period {
  const [y, m] = today.split('-').map(Number)
  const wraps = m <= 2
  return {
    kind: 'last3', year: y, month: m,
    start: toISO(wraps ? y - 1 : y, wraps ? m + 10 : m - 2, 1),
    end: toISO(y, m, daysInMonth(y, m)),
    label: 'Últimos 3 meses',
  }
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.kind === 'year') return yearPeriod(p.year + delta)
  if (p.kind === 'month') {
    const index = p.year * 12 + (p.month - 1) + delta
    return monthPeriod(Math.floor(index / 12), (index % 12) + 1)
  }
  return p
}

export interface TimelineItem {
  completion: Completion
  quest: Quest
  category: Category | undefined
  path: string
  ratings: Review[]
  average: number | null
}

export interface Report {
  total: number
  byCategory: { category: Category; count: number }[]
  byDifficulty: Record<Difficulty, number>
  unlocked: AchievementStatus[]
  best: TimelineItem[]
  photos: Photo[]
  timeline: TimelineItem[]
}

type ReportData = Pick<AppData, 'quests' | 'categories' | 'completions' | 'reviews' | 'photos'>

export function buildReport(period: Period, data: ReportData, statuses: AchievementStatus[]): Report {
  const inRange = (d: string | null) => d !== null && d >= period.start && d <= period.end
  const questById = new Map(data.quests.map((q) => [q.id, q]))
  const categoryById = new Map(data.categories.map((c) => [c.id, c]))

  const timeline: TimelineItem[] = data.completions
    .filter((c) => inRange(c.done_on) && questById.has(c.quest_id))
    .map((c) => {
      const quest = questById.get(c.quest_id)!
      const ratings = data.reviews.filter((r) => r.completion_id === c.id)
      const average = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null
      return { completion: c, quest, category: categoryById.get(quest.category_id), path: pathLabel(data.quests, quest.id), ratings, average }
    })
    .sort((a, b) => b.completion.done_on.localeCompare(a.completion.done_on) || b.completion.created_at.localeCompare(a.completion.created_at))

  const counts = new Map<string, number>()
  const byDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, epic: 0 }
  for (const item of timeline) {
    counts.set(item.quest.category_id, (counts.get(item.quest.category_id) ?? 0) + 1)
    byDifficulty[item.quest.difficulty]++
  }
  const byCategory = [...counts]
    .flatMap(([id, count]) => {
      const category = categoryById.get(id)
      return category ? [{ category, count }] : []
    })
    .sort((a, b) => b.count - a.count)

  const best = timeline
    .filter((i) => i.average !== null)
    .sort((a, b) => b.average! - a.average! || b.completion.done_on.localeCompare(a.completion.done_on))
    .slice(0, 3)

  const reviewDate = new Map<string, string>()
  for (const item of timeline) for (const r of item.ratings) reviewDate.set(r.id, item.completion.done_on)
  const photos = data.photos
    .filter((p) => p.review_id !== null && reviewDate.has(p.review_id))
    .sort((a, b) => reviewDate.get(a.review_id!)!.localeCompare(reviewDate.get(b.review_id!)!))

  return {
    total: timeline.length,
    byCategory,
    byDifficulty,
    unlocked: statuses.filter((s) => inRange(s.unlockedOn)),
    best,
    photos,
    timeline,
  }
}
