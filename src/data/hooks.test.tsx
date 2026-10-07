import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { useLiveSync } from './hooks'

const live = vi.hoisted(() => ({ onChange: [] as Array<() => void>, removed: 0 }))

vi.mock('../lib/supabase', () => {
  const channel = {
    on: (_event: string, _filter: unknown, cb: () => void) => {
      live.onChange.push(cb)
      return channel
    },
    subscribe: () => channel,
  }
  return { supabase: { channel: () => channel, removeChannel: () => live.removed++ } }
})

it('reloads the data when the other person changes something, and stops listening on unmount', () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { unmount } = renderHook(() => useLiveSync(), {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
  live.onChange.at(-1)!()
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['all'] })
  unmount()
  expect(live.removed).toBe(1)
})
