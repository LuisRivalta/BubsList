import { DEFAULT_RUNTIME } from '../../supabase/functions/_shared/catalog'
import type { Difficulty, MediaSource, Season } from './types'

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'epic']

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Média',
  hard: 'Difícil',
  epic: 'Épica',
}

export const difficultyRank = (d: Difficulty) => DIFFICULTIES.indexOf(d)

interface Sized {
  source: MediaSource
  runtime_minutes: number | null
  seasons: Season[]
}

export function totalMinutes(m: Sized): number | null {
  const perUnit = m.runtime_minutes || DEFAULT_RUNTIME[m.source]
  if (m.source === 'tmdb_movie') return perUnit
  if (m.seasons.length === 0) return null
  return m.seasons.reduce((sum, s) => sum + s.episodes, 0) * perUnit
}

export function suggestDifficulty(m: Sized): Difficulty | null {
  const total = totalMinutes(m)
  if (total === null) return null
  if (total <= 900) return 'easy'
  if (total <= 2400) return 'medium'
  if (total <= 6000) return 'hard'
  return 'epic'
}
