import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadAll, signedUrls } from './api'

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
