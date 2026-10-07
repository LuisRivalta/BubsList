import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { useLayoutEffect, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { SessionIdProvider } from '../data/session'
import { ME } from './fixtures'

export function renderRoute(routes: RouteObject[], url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={client}>
      <SessionIdProvider value={ME}>
        <RouterProvider router={router} />
      </SessionIdProvider>
    </QueryClientProvider>,
  )
  return router
}

// Parent layout effects run after their children's and before any passive effect: `read` sees what the first paint shows.
export function BeforePaint({ read, children }: { read: () => void; children: ReactNode }) {
  useLayoutEffect(() => {
    read()
  }, [])
  return children
}
