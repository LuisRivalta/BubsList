import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router'
import Celebration from '../components/Celebration'
import { SessionIdProvider } from '../data/session'
import { routes } from '../routes'
import { ME, sampleData } from './sampleData'
import '../fonts'
import 'lenis/dist/lenis.css'
import '../index.css'

// Dev-only: renders any route with sample data and a fake session, no Supabase. Not part of the build.
const params = new URLSearchParams(location.search)
const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
client.setQueryData(['all'], sampleData)
client.setQueryData(['signed'], {})
const router = createMemoryRouter(routes, { initialEntries: [params.get('url') ?? '/'] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <SessionIdProvider value={ME}>
        <RouterProvider router={router} />
        {params.get('celebrate') && <Celebration achievements={sampleData.achievements.slice(6, 8)} onClose={() => {}} />}
      </SessionIdProvider>
    </QueryClientProvider>
  </StrictMode>,
)
