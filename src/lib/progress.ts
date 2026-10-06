import type { MediaSource, Quest, Season } from './types'

export interface Progress {
  season: number
  episode: number
}

export function nextEpisode(seasons: Season[], current: Progress | null): Progress | null {
  const sorted = [...seasons].sort((a, b) => a.season - b.season)
  if (!current) return { season: sorted[0]?.season ?? 1, episode: 1 }
  if (sorted.length === 0) return { season: current.season, episode: current.episode + 1 }
  const season = sorted.find((s) => s.season === current.season)
  if (season && current.episode < season.episodes) return { season: current.season, episode: current.episode + 1 }
  const next = sorted.find((s) => s.season > current.season)
  return next ? { season: next.season, episode: 1 } : null
}

export function formatProgress(source: MediaSource, seasons: Season[], current: Progress | null): string {
  if (!current) return 'Não começou'
  if (source === 'anilist') {
    const total = seasons[0]?.episodes
    return total ? `E${current.episode} / ${total}` : `E${current.episode}`
  }
  return `T${current.season} E${current.episode}`
}

export const progressOf = (q: Quest): Progress | null =>
  q.progress_season !== null && q.progress_episode !== null ? { season: q.progress_season, episode: q.progress_episode } : null
