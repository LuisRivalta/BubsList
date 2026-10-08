import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchCatalogDetails } from '../lib/catalog'
import { todayISO } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { Media } from '../lib/types'
import { loadAll, signedUrls, upsertMedia } from './api'

const ALL = ['all']

export const useAppData = () => useQuery({ queryKey: ALL, queryFn: loadAll })

// Any change in the database (usually made by the other person) reloads everything; RLS still filters what arrives.
export function useLiveSync() {
  const client = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => client.invalidateQueries({ queryKey: ALL }))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [client])
}

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

// "Hoje" moves at midnight, and the installed app stays open in the background for days: re-read the date whenever it comes back.
export function useToday() {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const update = () => setToday(todayISO())
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return today
}
