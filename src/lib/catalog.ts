import { normalizeAniList, normalizeAniListHit } from '../../supabase/functions/_shared/catalog'
import { supabase } from './supabase'
import type { CatalogHit, CategoryKind, MediaSource, NormalizedMedia } from './types'

type CatalogKind = Exclude<CategoryKind, 'general'>

export const KIND_SOURCE: Record<CatalogKind, MediaSource> = { movie: 'tmdb_movie', series: 'tmdb_tv', anime: 'anilist' }

const ANILIST = 'https://graphql.anilist.co'
const SEARCH = `query ($q: String) { Page(perPage: 10) { media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
  id title { romaji english } coverImage { large } seasonYear } } }`
const DETAILS = `query ($id: Int) { Media(id: $id, type: ANIME) {
  id title { romaji english } coverImage { large } description episodes duration genres seasonYear nextAiringEpisode { episode } } }`

async function anilist(query: string, variables: Record<string, unknown>) {
  const res = await fetch(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`AniList ${res.status}`)
  return (await res.json()).data
}

async function tmdb<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tmdb', { body })
  if (error) throw error
  return data as T
}

export async function searchCatalog(kind: CatalogKind, query: string): Promise<CatalogHit[]> {
  if (kind === 'anime') return (await anilist(SEARCH, { q: query })).Page.media.map(normalizeAniListHit)
  return tmdb<CatalogHit[]>({ action: 'search', type: kind === 'movie' ? 'movie' : 'tv', query })
}

export async function fetchCatalogDetails(source: MediaSource, externalId: string): Promise<NormalizedMedia> {
  if (source === 'anilist') return normalizeAniList((await anilist(DETAILS, { id: Number(externalId) })).Media)
  return tmdb<NormalizedMedia>({ action: 'details', type: source === 'tmdb_movie' ? 'movie' : 'tv', id: externalId })
}
