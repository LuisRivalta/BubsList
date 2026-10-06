import { createBrowserRouter, RouterProvider } from 'react-router'
import Layout from './components/Layout'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <p className="text-gray-500">Em construção…</p> },
      { path: '*', element: <p>Página não encontrada.</p> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
