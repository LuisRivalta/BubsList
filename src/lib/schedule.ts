// Scheduled quests: the date label ("Hoje", "sáb, 10/10 · 20h", "Atrasada · 03/10"), Próximas, and the calendar link.
import type { Quest } from './types'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const DAY_MS = 86_400_000
const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export const isOverdue = (on: string, today: string) => on < today

export function timeLabel(time: string): string {
  const [h, m] = time.split(':')
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export function scheduleLabel(on: string, time: string | null, today: string): string {
  if (isOverdue(on, today)) return `Atrasada · ${dayMonth(on)}`
  const diff = dayNumber(on) - dayNumber(today)
  const day = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${WEEKDAYS[new Date(dayNumber(on) * DAY_MS).getUTCDay()]}, ${dayMonth(on)}`
  return time ? `${day} · ${timeLabel(time)}` : day
}

// Quests with a date, soonest first; late ones come first because their date is smaller.
// Completing a quest clears its date (CompletePage), so a done quest with a date is planned again ("Fazer de novo").
export function upcoming(quests: Quest[]): Quest[] {
  const key = (q: Quest) => `${q.scheduled_on} ${q.scheduled_time ?? ''}`
  return quests.filter((q) => q.scheduled_on).sort((a, b) => key(a).localeCompare(key(b)))
}

export function calendarUrl(q: Pick<Quest, 'id' | 'title' | 'scheduled_on' | 'scheduled_time'>, place: string | null): string {
  const p = new URLSearchParams({ t: q.title, d: q.scheduled_on ?? '' })
  if (q.scheduled_time) p.set('h', q.scheduled_time.slice(0, 5))
  if (place) p.set('l', place)
  p.set('id', q.id)
  return `/api/calendario?${p}`
}
