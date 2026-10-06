import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchCatalogDetails } from '../lib/catalog'
import type { Media } from '../lib/types'
import { loadAll, signedUrls, upsertMedia } from './api'

const ALL = ['all']

export const useAppData = () => useQuery({ queryKey: ALL, queryFn: loadAll })

export function useRefresh() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ALL })
}

export const useSignedUrls = (paths: string[]) =>
  useQuery({
    queryKey: ['signed', ...paths],
    queryFn: () => signedUrls(paths),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  })

const WEEK = 7 * 24 * 60 * 60 * 1000

export function useMediaRefresh(media: Media | undefined) {
  const refresh = useRefresh()
  const stale = !!media && media.source !== 'tmdb_movie' && Date.now() - Date.parse(media.fetched_at) > WEEK
  useEffect(() => {
    if (!stale || !media) return
    fetchCatalogDetails(media.source, media.external_id)
      .then(upsertMedia)
      .then(() => refresh())
      .catch(() => {})
  }, [stale, media])
}
