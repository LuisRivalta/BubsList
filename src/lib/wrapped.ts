import { evaluateAchievements, type AchievementStatus } from './achievements'
import { formatDate } from './dates'
import { DIFFICULTIES, DIFFICULTY_LABEL } from './difficulty'
import { buildReport, yearPeriod, type TimelineItem } from './report'
import type { ImageRef, StoryCard } from './story'
import { doneQuestIds } from './tree'
import type { AppData, Category, Photo } from './types'

export type Slide =
  | { kind: 'intro'; year: number; names: string[] }
  | { kind: 'total'; total: number; busiestMonth: string; busiestCount: number }
  | { kind: 'categories'; top: { category: Category; count: number }[] }
  | { kind: 'hardest'; item: TimelineItem; image: ImageRef | null }
  | { kind: 'best'; item: TimelineItem; image: ImageRef | null }
  | { kind: 'disagree'; item: TimelineItem; image: ImageRef | null; ratings: { name: string; rating: number }[] }
  | { kind: 'medals'; unlocked: AchievementStatus[] }
  | { kind: 'album'; photos: Photo[] }
  | { kind: 'outro'; next: number; pending: number }

const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const rank = (i: TimelineItem) => DIFFICULTIES.indexOf(i.quest.difficulty)
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// The year's slides in order; slides without data are left out. Empty when the year has no completions.
export function buildWrapped(year: number, data: AppData, me: string): Slide[] {
  const report = buildReport(yearPeriod(year), data, evaluateAchievements(data.achievements, data.quests, data.completions))
  if (report.total === 0) return []
  const { timeline } = report // most recent first
  const nameOf = (id: string) => data.profiles.find((p) => p.id === id)?.display_name ?? '?'
  const names = [...data.profiles].sort((a, b) => Number(b.id === me) - Number(a.id === me)).map((p) => p.display_name)

  const perMonth = Array.from({ length: 12 }, () => 0)
  for (const i of timeline) perMonth[Number(i.completion.done_on.slice(5, 7)) - 1]++
  const busiest = perMonth.indexOf(Math.max(...perMonth)) // indexOf: the earliest month wins a tie

  const imageOf = (i: TimelineItem): ImageRef | null => {
    const reviewIds = new Set(i.ratings.map((r) => r.id))
    const photo =
      data.photos.find((p) => p.review_id !== null && reviewIds.has(p.review_id)) ?? data.photos.find((p) => p.quest_id === i.quest.id)
    if (photo) return { path: photo.storage_path }
    const poster = data.media.find((m) => m.id === i.quest.media_id)?.poster_url
    return poster ? { url: poster } : null
  }

  const hardest = timeline.reduce((a, b) => (rank(b) > rank(a) ? b : a))
  let disagree: { item: TimelineItem; diff: number } | null = null
  for (const item of timeline) {
    if (new Set(item.ratings.map((r) => r.user_id)).size < 2) continue
    const values = item.ratings.map((r) => r.rating)
    const diff = Math.max(...values) - Math.min(...values)
    if (diff > (disagree?.diff ?? 0)) disagree = { item, diff }
  }
  const best = report.best[0]
  const done = doneQuestIds(data.completions)

  const slides: (Slide | null)[] = [
    { kind: 'intro', year, names },
    { kind: 'total', total: report.total, busiestMonth: capitalize(MONTH.format(Date.UTC(year, busiest, 1))), busiestCount: perMonth[busiest] },
    report.byCategory.length ? { kind: 'categories', top: report.byCategory.slice(0, 3) } : null,
    { kind: 'hardest', item: hardest, image: imageOf(hardest) },
    best ? { kind: 'best', item: best, image: imageOf(best) } : null,
    disagree
      ? {
          kind: 'disagree',
          item: disagree.item,
          image: imageOf(disagree.item),
          ratings: [...disagree.item.ratings].sort((a, b) => b.rating - a.rating).map((r) => ({ name: nameOf(r.user_id), rating: r.rating })),
        }
      : null,
    report.unlocked.length ? { kind: 'medals', unlocked: report.unlocked } : null,
    report.photos.length ? { kind: 'album', photos: report.photos } : null,
    { kind: 'outro', next: year + 1, pending: data.quests.filter((q) => q.parent_id === null && !done.has(q.id)).length },
  ]
  return slides.filter((s): s is Slide => s !== null)
}

export function storyCard(slide: Slide): StoryCard {
  switch (slide.kind) {
    case 'intro':
      return { eyebrow: 'Retrospectiva', big: String(slide.year), caption: slide.names.join(' & '), image: null }
    case 'total':
      return {
        eyebrow: 'No ano, vocês concluíram',
        big: count(slide.total, 'quest', 'quests'),
        caption: `${slide.busiestMonth} foi o mês mais movimentado (${slide.busiestCount})`,
        image: null,
      }
    case 'categories':
      return {
        eyebrow: 'Categoria favorita',
        big: slide.top[0].category.name,
        caption: slide.top.map((t) => `${t.category.name}: ${t.count}`).join(' · '),
        image: null,
      }
    case 'hardest':
      return {
        eyebrow: 'A mais difícil',
        big: slide.item.quest.title,
        caption: `${DIFFICULTY_LABEL[slide.item.quest.difficulty]} · ${formatDate(slide.item.completion.done_on)}`,
        image: slide.image,
      }
    case 'best':
      return {
        eyebrow: 'Melhor momento',
        big: slide.item.quest.title,
        caption: `Nota ${slide.item.average!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 5`,
        image: slide.image,
      }
    case 'disagree':
      return { eyebrow: 'Discordância', big: slide.item.quest.title, caption: slide.ratings.map((r) => `${r.name} deu ${r.rating}`).join(', '), image: slide.image }
    case 'medals':
      return {
        eyebrow: 'Conquistas do ano',
        big: count(slide.unlocked.length, 'medalha', 'medalhas'),
        caption: slide.unlocked.map((s) => s.achievement.name).join(' · '),
        image: null,
      }
    case 'album':
      return { eyebrow: 'Álbum do ano', big: count(slide.photos.length, 'foto', 'fotos'), caption: 'Os nossos momentos', image: { path: slide.photos[0].storage_path } }
    case 'outro':
      return { eyebrow: `Bora pra ${slide.next}`, big: count(slide.pending, 'quest', 'quests'), caption: 'esperando por vocês', image: null }
  }
}
