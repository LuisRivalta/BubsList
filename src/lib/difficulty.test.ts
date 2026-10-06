import { describe, expect, it } from 'vitest'
import { normalizeAniList } from '../../supabase/functions/_shared/catalog'
import { difficultyRank, suggestDifficulty, totalMinutes } from './difficulty'
import type { Difficulty } from './types'

const tv = (minutes: number) => ({ source: 'tmdb_tv' as const, runtime_minutes: 1, seasons: [{ season: 1, episodes: minutes }] })

describe('suggestDifficulty', () => {
  it('any movie is easy', () => {
    expect(suggestDifficulty({ source: 'tmdb_movie', runtime_minutes: 180, seasons: [] })).toBe('easy')
  })

  it.each<[number, Difficulty]>([
    [900, 'easy'], [901, 'medium'], [2400, 'medium'], [2401, 'hard'], [6000, 'hard'], [6001, 'epic'],
  ])('%i minutes → %s', (minutes, expected) => {
    expect(suggestDifficulty(tv(minutes))).toBe(expected)
  })

  it('a 20-episode anime is easy', () => {
    expect(suggestDifficulty({ source: 'anilist', runtime_minutes: 24, seasons: [{ season: 1, episodes: 20 }] })).toBe('easy')
  })

  it('One Piece (airing, total unknown) is epic', () => {
    const onePiece = normalizeAniList({ id: 21, title: { english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 }, duration: 24 })
    expect(suggestDifficulty(onePiece)).toBe('epic')
  })

  it('gives no suggestion when the episode count is unknown', () => {
    expect(suggestDifficulty({ source: 'anilist', runtime_minutes: 24, seasons: [] })).toBeNull()
  })

  it('uses the default runtime when missing', () => {
    expect(totalMinutes({ source: 'tmdb_tv', runtime_minutes: null, seasons: [{ season: 1, episodes: 10 }] })).toBe(450)
  })
})

it('ranks difficulties easy < medium < hard < epic', () => {
  const order: Difficulty[] = ['epic', 'easy', 'hard', 'medium']
  expect(order.map(difficultyRank)).toEqual([3, 0, 2, 1])
})
