import { describe, expect, it } from 'vitest'
import { quest } from '../test/fixtures'
import { formatProgress, nextEpisode, progressOf } from './progress'

const seasons = [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }]

describe('nextEpisode', () => {
  it('starts at S1E1', () => expect(nextEpisode(seasons, null)).toEqual({ season: 1, episode: 1 }))
  it('advances within a season', () => expect(nextEpisode(seasons, { season: 1, episode: 3 })).toEqual({ season: 1, episode: 4 }))
  it('jumps to the next season after its last episode', () =>
    expect(nextEpisode(seasons, { season: 1, episode: 10 })).toEqual({ season: 2, episode: 1 }))
  it('returns null at the very last episode', () => expect(nextEpisode(seasons, { season: 2, episode: 8 })).toBeNull())
  it('handles unsorted seasons', () =>
    expect(nextEpisode([seasons[1], seasons[0]], { season: 1, episode: 10 })).toEqual({ season: 2, episode: 1 }))
  it('only increments when seasons are unknown', () =>
    expect(nextEpisode([], { season: 1, episode: 41 })).toEqual({ season: 1, episode: 42 }))
  it('starts at the first listed season', () =>
    expect(nextEpisode([{ season: 2, episodes: 5 }], null)).toEqual({ season: 2, episode: 1 }))
})

describe('formatProgress', () => {
  it('not started', () => expect(formatProgress('tmdb_tv', seasons, null)).toBe('Não começou'))
  it('series', () => expect(formatProgress('tmdb_tv', seasons, { season: 2, episode: 5 })).toBe('T2 E5'))
  it('anime with total', () => expect(formatProgress('anilist', [{ season: 1, episodes: 24 }], { season: 1, episode: 5 })).toBe('E5 / 24'))
  it('anime without total', () => expect(formatProgress('anilist', [], { season: 1, episode: 5 })).toBe('E5'))
})

it('reads progress from a quest', () => {
  expect(progressOf(quest({ progress_season: 2, progress_episode: 3 }))).toEqual({ season: 2, episode: 3 })
  expect(progressOf(quest())).toBeNull()
})
