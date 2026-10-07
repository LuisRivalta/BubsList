// Pure module shared by the web app (Vite) and the Edge Function (Deno). No imports allowed.

export type MediaSource = 'tmdb_movie' | 'tmdb_tv' | 'anilist'

export interface Season {
  season: number
  episodes: number
}

export interface CatalogHit {
  source: MediaSource
  external_id: string
  title: string
  year: number | null
  poster_url: string | null
}

export interface NormalizedMedia extends CatalogHit {
  synopsis: string | null
  genres: string[]
  runtime_minutes: number
  seasons: Season[]
}

export const DEFAULT_RUNTIME: Record<MediaSource, number> = { tmdb_movie: 120, tmdb_tv: 45, anilist: 24 }

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'

// deno-lint-ignore no-explicit-any
type Raw = any

const yearOf = (date?: string | null) => (date ? Number(date.slice(0, 4)) || null : null)
const tmdbPoster = (path?: string | null) => (path ? TMDB_IMG + path : null)
const genreNames = (genres?: { name: string }[]) => (genres ?? []).map((g) => g.name)

export function normalizeTmdbHit(type: 'movie' | 'tv', r: Raw): CatalogHit {
  const movie = type === 'movie'
  return {
    source: movie ? 'tmdb_movie' : 'tmdb_tv',
    external_id: String(r.id),
    title: (movie ? r.title || r.original_title : r.name || r.original_name) ?? '',
    year: yearOf(movie ? r.release_date : r.first_air_date),
    poster_url: tmdbPoster(r.poster_path),
  }
}

export function normalizeTmdbMovie(d: Raw): NormalizedMedia {
  return {
    ...normalizeTmdbHit('movie', d),
    synopsis: d.overview || null,
    genres: genreNames(d.genres),
    runtime_minutes: d.runtime || DEFAULT_RUNTIME.tmdb_movie,
    seasons: [],
  }
}

export function normalizeTmdbTv(d: Raw): NormalizedMedia {
  const runs: number[] = d.episode_run_time ?? []
  const average = runs.length ? Math.round(runs.reduce((a, b) => a + b, 0) / runs.length) : 0
  return {
    ...normalizeTmdbHit('tv', d),
    synopsis: d.overview || null,
    genres: genreNames(d.genres),
    runtime_minutes: average || d.last_episode_to_air?.runtime || DEFAULT_RUNTIME.tmdb_tv,
    seasons: (d.seasons ?? [])
      .filter((s: Raw) => s.season_number > 0 && s.episode_count > 0)
      .map((s: Raw) => ({ season: s.season_number, episodes: s.episode_count })),
  }
}

export function normalizeAniListHit(m: Raw): CatalogHit {
  return {
    source: 'anilist',
    external_id: String(m.id),
    title: m.title?.english || m.title?.romaji || '',
    year: m.seasonYear ?? null,
    poster_url: m.coverImage?.large ?? null,
  }
}

// AniList only speaks English; TMDB is fetched in pt-BR, so the same genre becomes the same type.
const ANILIST_GENRES: Record<string, string> = {
  Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama', Ecchi: 'Ecchi', Fantasy: 'Fantasia',
  Hentai: 'Hentai', Horror: 'Terror', 'Mahou Shoujo': 'Mahou shoujo', Mecha: 'Mecha', Music: 'Música', Mystery: 'Mistério',
  Psychological: 'Psicológico', Romance: 'Romance', 'Sci-Fi': 'Ficção científica', 'Slice of Life': 'Cotidiano',
  Sports: 'Esportes', Supernatural: 'Sobrenatural', Thriller: 'Thriller',
}

export function normalizeAniList(m: Raw): NormalizedMedia {
  const total: number | null = m.episodes ?? (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null)
  const synopsis = m.description
    ? String(m.description).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    : ''
  return {
    ...normalizeAniListHit(m),
    synopsis: synopsis || null,
    genres: ((m.genres ?? []) as string[]).map((g) => ANILIST_GENRES[g] ?? g),
    runtime_minutes: m.duration || DEFAULT_RUNTIME.anilist,
    seasons: total && total > 0 ? [{ season: 1, episodes: total }] : [],
  }
}
