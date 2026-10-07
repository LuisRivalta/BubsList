import { createBrowserRouter, RouterProvider } from 'react-router'
import { useLiveSync } from './data/hooks'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  useLiveSync()
  return <RouterProvider router={router} />
}
