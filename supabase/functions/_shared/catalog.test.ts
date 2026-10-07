import { describe, expect, it } from 'vitest'
import { normalizeAniList, normalizeAniListHit, normalizeTmdbHit, normalizeTmdbMovie, normalizeTmdbTv } from './catalog'

describe('normalizeTmdbMovie', () => {
  it('maps the TMDB movie payload', () => {
    const m = normalizeTmdbMovie({
      id: 603, title: 'Matrix', original_title: 'The Matrix', release_date: '1999-03-30',
      poster_path: '/p.jpg', overview: 'Neo…', genres: [{ id: 1, name: 'Ação' }], runtime: 136,
    })
    expect(m).toEqual({
      source: 'tmdb_movie', external_id: '603', title: 'Matrix', year: 1999,
      poster_url: 'https://image.tmdb.org/t/p/w342/p.jpg', synopsis: 'Neo…', genres: ['Ação'],
      runtime_minutes: 136, seasons: [],
    })
  })

  it('falls back to the original title, 120 minutes and nulls', () => {
    const m = normalizeTmdbMovie({ id: 1, title: '', original_title: 'Orig', release_date: '', poster_path: null, overview: '', runtime: 0 })
    expect(m).toMatchObject({ title: 'Orig', year: null, poster_url: null, synopsis: null, genres: [], runtime_minutes: 120 })
  })
})

describe('normalizeTmdbTv', () => {
  const base = { id: 1396, name: 'Breaking Bad', first_air_date: '2008-01-20', poster_path: null, overview: 'x', genres: [] }

  it('drops specials and empty seasons and averages the run time', () => {
    const m = normalizeTmdbTv({
      ...base,
      episode_run_time: [42, 48],
      seasons: [
        { season_number: 0, episode_count: 9 },
        { season_number: 1, episode_count: 7 },
        { season_number: 2, episode_count: 13 },
        { season_number: 3, episode_count: 0 },
      ],
    })
    expect(m.seasons).toEqual([{ season: 1, episodes: 7 }, { season: 2, episodes: 13 }])
    expect(m).toMatchObject({ source: 'tmdb_tv', external_id: '1396', year: 2008, runtime_minutes: 45 })
  })

  it('uses the last episode runtime when episode_run_time is empty', () => {
    expect(normalizeTmdbTv({ ...base, episode_run_time: [], last_episode_to_air: { runtime: 22 }, seasons: [] }).runtime_minutes).toBe(22)
  })

  it('falls back to 45 minutes', () => {
    expect(normalizeTmdbTv({ ...base, seasons: [] }).runtime_minutes).toBe(45)
  })
})

describe('normalizeTmdbHit', () => {
  it('maps a tv search hit', () => {
    expect(normalizeTmdbHit('tv', { id: 1, name: 'Dark', first_air_date: '2017-12-01', poster_path: '/d.jpg' })).toEqual({
      source: 'tmdb_tv', external_id: '1', title: 'Dark', year: 2017, poster_url: 'https://image.tmdb.org/t/p/w342/d.jpg',
    })
  })
})

describe('normalizeAniList', () => {
  const frieren = {
    id: 154587,
    title: { romaji: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End" },
    coverImage: { large: 'https://img/f.jpg' },
    description: 'Elf <i>mage</i><br>story',
    episodes: 28, duration: 24, genres: ['Adventure'], seasonYear: 2023, nextAiringEpisode: null,
  }

  it('prefers the english title, strips html and builds one season', () => {
    expect(normalizeAniList(frieren)).toEqual({
      source: 'anilist', external_id: '154587', title: "Frieren: Beyond Journey's End", year: 2023,
      poster_url: 'https://img/f.jpg', synopsis: 'Elf mage\nstory', genres: ['Aventura'],
      runtime_minutes: 24, seasons: [{ season: 1, episodes: 28 }],
    })
  })

  it('translates AniList genres to the Portuguese names TMDB uses', () => {
    expect(normalizeAniList({ ...frieren, genres: ['Action', 'Sci-Fi', 'Slice of Life', 'Horror', 'Unknown'] }).genres)
      .toEqual(['Ação', 'Ficção científica', 'Cotidiano', 'Terror', 'Unknown'])
  })

  it('falls back to romaji and 24 minutes', () => {
    expect(normalizeAniList({ ...frieren, title: { romaji: 'Sousou no Frieren', english: null }, duration: null }))
      .toMatchObject({ title: 'Sousou no Frieren', runtime_minutes: 24 })
  })

  it('counts aired episodes of an airing show with unknown total (One Piece)', () => {
    const onePiece = { ...frieren, id: 21, title: { romaji: 'ONE PIECE', english: 'ONE PIECE' }, episodes: null, nextAiringEpisode: { episode: 1141 } }
    expect(normalizeAniList(onePiece).seasons).toEqual([{ season: 1, episodes: 1140 }])
  })

  it('leaves seasons empty when nothing is known', () => {
    expect(normalizeAniList({ ...frieren, episodes: null, nextAiringEpisode: null }).seasons).toEqual([])
  })

  it('maps a search hit', () => {
    expect(normalizeAniListHit(frieren)).toEqual({
      source: 'anilist', external_id: '154587', title: "Frieren: Beyond Journey's End", year: 2023, poster_url: 'https://img/f.jpg',
    })
  })
})
